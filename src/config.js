// src/config.js
// Configure the cities and keywords the scraper monitors.
// Add any city or ZIP code area you want to watch.

module.exports = {

  // Cities to monitor — lat/lon centers with a scan radius
    MONITORED_AREAS: [
    { name: 'Chicago Downtown',      lat: 41.8827, lon: -87.6233, radiusKm: 2.0 },
    { name: 'Chicago Wicker Park',   lat: 41.9082, lon: -87.6780, radiusKm: 1.5 },
    { name: 'Chicago Navy Pier',     lat: 41.8917, lon: -87.6086, radiusKm: 1.5 },
    { name: 'New York Times Square', lat: 40.7580, lon: -73.9855, radiusKm: 2.0 },
    { name: 'New York Brooklyn',     lat: 40.6782, lon: -73.9442, radiusKm: 2.0 },
    { name: 'Los Angeles Hollywood', lat: 34.0928, lon: -118.3287, radiusKm: 2.0 },
    { name: 'Los Angeles Downtown',  lat: 34.0522, lon: -118.2437, radiusKm: 2.0 },
    { name: 'Houston Downtown',      lat: 29.7604, lon: -95.3698, radiusKm: 2.0 },
    { name: 'Atlanta Downtown',      lat: 33.7490, lon: -84.3880, radiusKm: 2.0 },
    { name: 'Miami Downtown',        lat: 25.7617, lon: -80.1918, radiusKm: 2.0 },
    { name: 'Dallas Downtown',       lat: 32.7767, lon: -96.7970, radiusKm: 2.0 },
    { name: 'Philadelphia Downtown', lat: 39.9526, lon: -75.1652, radiusKm: 2.0 },
    { name: 'Phoenix Downtown',      lat: 33.4484, lon: -112.0740, radiusKm: 2.0 },
    { name: 'San Antonio Riverwalk', lat: 29.4241, lon: -98.4936, radiusKm: 2.0 },
    { name: 'Indianapolis Downtown', lat: 39.7684, lon: -86.1581, radiusKm: 2.0 },
    { name: 'Memphis Downtown',      lat: 35.1495, lon: -90.0490, radiusKm: 2.0 },
    { name: 'St Louis Downtown',     lat: 38.6270, lon: -90.1994, radiusKm: 2.0 },
  ],

  // Keywords that signal a crowd event
  // Matched against post text — any single keyword triggers a spike candidate
  CROWD_KEYWORDS: [
    'mob', 'teen takeover', 'crowd', 'riot', 'swarm', 'rushing',
    'flashmob', 'flash mob', 'hundreds of people', 'huge crowd',
    'police called', 'street closed', 'blocked traffic',
    'running from', 'stampede', 'fight broke out', 'brawl',
    'out of control', 'avoid downtown', 'stay away',
  ],

  // High-signal keywords — a single match from this list is weighted heavier
  HIGH_SIGNAL_KEYWORDS: [
    'teen takeover', 'mob', 'riot', 'stampede', 'brawl', 'running from',
  ],

  // Platforms / sources to scrape
  // Each source module lives in src/sources/
  SOURCES: [
    'twitter',    // X/Twitter search (Nitter instances)
    'reddit',     // Reddit search via public JSON API (no key needed)
    'rss',        // Local news RSS feeds (free, no API key)
    'bluesky',    // Bluesky AT Protocol (free, no API key, no rate limits)
  ],

  // How often each source is scraped (cron expression)
  SCRAPE_INTERVAL_CRON: '*/3 * * * *',  // every 3 minutes

  // Minimum spike multiplier to report (2.0 = 200% above baseline)
  MIN_SPIKE_MULTIPLIER: 2.0,

  // Baseline window: how many minutes of history to compute the baseline from
  BASELINE_WINDOW_MINUTES: 60,

  // SurgeAlert API endpoint to POST spikes to
  SURGEALERT_API_URL: process.env.SURGEALERT_API_URL || 'http://localhost:3000',

  // Secret for webhook auth (set in .env)
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',
};
