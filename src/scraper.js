// src/scraper.js
// Main orchestrator. Runs on a cron schedule.
// For each monitored area:
//   1. Scrapes all configured sources
//   2. Counts keyword-matching posts
//   3. Checks for volume spike vs baseline
//   4. POSTs spike data to the SurgeAlert API

require('dotenv').config();
const cron  = require('node-cron');
const axios = require('axios');

const config         = require('./config');
const spikeDetector  = require('./spikeDetector');
const redditSource   = require('./sources/reddit');
const twitterSource  = require('./sources/twitter');
const rssSource      = require('./sources/rss');
const openDataSource = require('./sources/opendata');
const tiktokSource   = require('./sources/tiktok');
const bskySource     = require('./sources/bluesky');

const SOURCES = {
  reddit:  redditSource,
  twitter: twitterSource,
  rss:     rssSource,
  opendata: openDataSource,
  tiktok:   tiktokSource,
  bluesky: bskySource,
};

// Track which post IDs we've already seen to avoid duplicate counting
const seenPostIds = new Set();
const MAX_SEEN_SIZE = 50000;

async function scrapeArea(area) {
  const allPosts = [];

  for (const sourceName of config.SOURCES) {
    const source = SOURCES[sourceName];
    if (!source) {
      console.warn(`[scraper] Unknown source: ${sourceName}`);
      continue;
    }

    try {
      console.log(`[scraper] Scraping ${sourceName} for "${area.name}"…`);
      const posts = await source.scrapeArea(area);
      console.log(`[scraper] ${sourceName} → ${posts.length} matching posts for "${area.name}"`);
      allPosts.push(...posts);
    } catch (err) {
      console.error(`[scraper] ${sourceName} error for ${area.name}:`, err.message);
    }
  }

  // Count only NEW posts (not seen in previous cycles)
  let newCount = 0;
  let highSignalCount = 0;

  for (const post of allPosts) {
    const uid = `${post.platform}:${post.id}`;
    if (!seenPostIds.has(uid)) {
      seenPostIds.add(uid);
      newCount++;
      if (post.highSignal) highSignalCount++;
    }
  }

  // Keep the seen set from growing unbounded
  if (seenPostIds.size > MAX_SEEN_SIZE) {
    const arr = [...seenPostIds];
    arr.splice(0, 10000).forEach(id => seenPostIds.delete(id));
  }

  console.log(`[scraper] "${area.name}" → ${newCount} new posts (${highSignalCount} high-signal)`);

  // Weight high-signal posts heavier in the count
  const weightedCount = newCount + (highSignalCount * 2);
  spikeDetector.recordCount(area.name, weightedCount);

  const spike = spikeDetector.detectSpike(area.name, weightedCount);

  if (spike) {
    console.log(`[scraper] 🚨 SPIKE detected in "${area.name}"! ${spike.multiplier}x baseline`);

    // Collect the actual keywords found for reporting
    const allKeywords = [...new Set(allPosts.flatMap(p => p.keywords))];

    await reportSpike(area, spike, allKeywords, allPosts.slice(0, 3));
  } else {
    console.log(`[scraper] "${area.name}" — no spike (count: ${weightedCount})`);
  }
}

async function reportSpike(area, spike, keywords, samplePosts) {
  try {
    const payload = {
      lat:              area.lat,
      lon:              area.lon,
      spikeMultiplier:  spike.multiplier,
      platform:         'multi-source',
      keywords,
      locationLabel:    area.name,
      metadata: {
        baseline:     spike.baseline,
        currentCount: spike.current,
        sampleUrls:   samplePosts.map(p => p.url).filter(Boolean),
      },
    };

    const { data } = await axios.post(
      `${config.SURGEALERT_API_URL}/api/socials/spike`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(config.WEBHOOK_SECRET && { 'x-webhook-secret': config.WEBHOOK_SECRET }),
        },
        timeout: 5000,
      }
    );

    if (data.alertFired) {
      console.log(`[scraper] ✅ Alert fired for "${area.name}" — alert ID: ${data.alert?.id}`);
    } else {
      console.log(`[scraper] Spike reported for "${area.name}" — no new alert (cooldown active)`);
    }
  } catch (err) {
    console.error(`[scraper] Failed to report spike for "${area.name}":`, err.message);
  }
}

async function runOnce() {
  console.log(`[scraper] Running scrape cycle — ${new Date().toISOString()}`);
  for (const area of config.MONITORED_AREAS) {
    await scrapeArea(area);
  }
  console.log('[scraper] Cycle complete');
}

function start() {
  console.log(`[scraper] Starting — monitoring ${config.MONITORED_AREAS.length} areas`);
  console.log(`[scraper] Cron: ${config.SCRAPE_INTERVAL_CRON}`);
  console.log('[scraper] Sources:', config.SOURCES.join(', '));

  // Run immediately on start
  runOnce();

  // Then run on schedule
  cron.schedule(config.SCRAPE_INTERVAL_CRON, runOnce);
}

module.exports = { start, runOnce };
