// src/sources/twitter.js
// Scrapes Nitter (open-source Twitter frontend) search — no API key needed.
// Falls back through multiple Nitter instances if one is down.
// For production with budget: swap for official X API v2 filtered stream.

const axios   = require('axios');
const cheerio = require('cheerio');
const { CROWD_KEYWORDS, HIGH_SIGNAL_KEYWORDS } = require('../config');

// Public Nitter instances — try in order, skip if down
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
];

const headers = {
  'User-Agent': 'Mozilla/5.0 (compatible; SurgeAlertBot/1.0)',
  'Accept': 'text/html',
};

// Try each Nitter instance until one responds
async function fetchNitter(path) {
  for (const instance of NITTER_INSTANCES) {
    try {
      const { data } = await axios.get(`${instance}${path}`, {
        headers,
        timeout: 8000,
      });
      return data;
    } catch (err) {
      console.warn(`[twitter] Nitter ${instance} failed: ${err.message}`);
    }
  }
  return null;
}

// Parse tweets from Nitter HTML
function parseTweets(html) {
  const $ = cheerio.load(html);
  const tweets = [];

  $('.timeline-item').each((_, el) => {
    const text     = $(el).find('.tweet-content').text().trim();
    const username = $(el).find('.username').text().trim();
    const timeEl   = $(el).find('.tweet-date a');
    const href     = timeEl.attr('href') ?? '';
    const tweetId  = href.split('/').pop()?.split('#')[0] ?? '';

    if (!text || !tweetId) return;
    tweets.push({ text, username, tweetId, href });
  });

  return tweets;
}

async function scrapeArea(area) {
  const results = [];
  const allKeywords = [...new Set([...HIGH_SIGNAL_KEYWORDS, ...CROWD_KEYWORDS.slice(0, 8)])];

  // Build search queries: high-signal terms + location name
  const searchTerms = [
    // Location + high-signal
    `${HIGH_SIGNAL_KEYWORDS.slice(0, 3).join(' OR ')} ${area.name}`,
    // General crowd terms + location
    `crowd OR mob OR swarm ${area.name}`,
  ];

  for (const q of searchTerms) {
    const encoded = encodeURIComponent(q);
    const html = await fetchNitter(`/search?f=tweets&q=${encoded}&since_id=&max_position=`);
    if (!html) continue;

    const tweets = parseTweets(html);

    for (const tweet of tweets) {
      const text = tweet.text.toLowerCase();
      const matchedKeywords = allKeywords.filter(k => text.includes(k.toLowerCase()));
      if (matchedKeywords.length === 0) continue;

      const isHighSignal = HIGH_SIGNAL_KEYWORDS.some(k => text.includes(k.toLowerCase()));

      results.push({
        platform:   'twitter',
        id:         tweet.tweetId,
        text:       tweet.text,
        url:        `https://twitter.com${tweet.href}`,
        createdAt:  Date.now(), // Nitter doesn't always give exact timestamps
        keywords:   matchedKeywords,
        highSignal: isHighSignal,
        username:   tweet.username,
      });
    }

    await sleep(1500); // polite delay
  }

  // Deduplicate
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scrapeArea };
