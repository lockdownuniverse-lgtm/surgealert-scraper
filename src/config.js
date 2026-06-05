// src/config.js
// Configure the cities and keywords the scraper monitors.
// Add any city or ZIP code area you want to watch.

module.exports = {

  // Cities to monitor — lat/lon centers with a scan radius
  MONITORED_AREAS: [
    { name: 'Chicago Downtown',    lat: 41.8827, lon: -87.6233, radiusKm: 2.0 },
    { name: 'Chicago Wicker Park', lat: 41.9082, lon: -87.6780, radiusKm: 1.5 },
    { name: 'Chicago Navy Pier',   lat: 41.8917, lon: -87.6086, radiusKm: 1.5 },
    // Add your cities here:
    // { name: 'Times Square NYC',  lat: 40.7580, lon: -73.9855, radiusKm: 1.5 },
    // { name: 'Hollywood Blvd LA', lat: 34.1016, lon: -118.3401, radiusKm: 1.5 },
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
    'twitter',    // X/Twitter search (requires API key or nitter scrape)
    'reddit',     // Reddit search via public JSON API (no key needed)
    'nextdoor',   // Nextdoor public posts (scraper, limited)
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
