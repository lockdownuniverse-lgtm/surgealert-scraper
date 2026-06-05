// src/sources/reddit.js
// Scrapes Reddit's public search API (no API key required for basic search).
// Searches r/all and local city subreddits for crowd keyword matches.

const axios = require('axios');
const { CROWD_KEYWORDS, HIGH_SIGNAL_KEYWORDS } = require('../config');

const REDDIT_SEARCH_URL = 'https://www.reddit.com/search.json';
const LOCAL_SUBREDDITS  = ['chicago', 'AskChicago', 'ChicagoSuburbs'];
// Add your city subreddits here: 'nyc', 'LosAngeles', 'Atlanta', etc.

const headers = {
  'User-Agent': 'SurgeAlertBot/1.0 (crowd safety monitoring; contact: admin@surgealert.app)',
};

// Search Reddit for recent posts matching crowd keywords near an area
async function scrapeArea(area) {
  const results = [];
  const allKeywords = [...CROWD_KEYWORDS, ...HIGH_SIGNAL_KEYWORDS];

  // Build a search query: top keywords OR'd together
  const queryTerms = HIGH_SIGNAL_KEYWORDS.slice(0, 5)
    .map(k => `"${k}"`)
    .join(' OR ');

  const queries = [
    // r/all search with location context
    {
      url: REDDIT_SEARCH_URL,
      params: {
        q: `${queryTerms} ${area.name}`,
        sort: 'new',
        t: 'hour',
        limit: 25,
        type: 'link',
      },
    },
    // Local subreddit searches
    ...LOCAL_SUBREDDITS.map(sub => ({
      url: `https://www.reddit.com/r/${sub}/search.json`,
      params: {
        q: queryTerms,
        sort: 'new',
        t: 'hour',
        limit: 25,
        restrict_sr: 1,
      },
    })),
  ];

  for (const query of queries) {
    try {
      const { data } = await axios.get(query.url, {
        params: query.params,
        headers,
        timeout: 8000,
      });

      const posts = data?.data?.children ?? [];
      for (const post of posts) {
        const d = post.data;
        const text = `${d.title} ${d.selftext}`.toLowerCase();
        const matchedKeywords = allKeywords.filter(k => text.includes(k.toLowerCase()));

        if (matchedKeywords.length === 0) continue;

        const isHighSignal = HIGH_SIGNAL_KEYWORDS.some(k => text.includes(k.toLowerCase()));

        results.push({
          platform:    'reddit',
          id:          d.id,
          text:        d.title,
          url:         `https://reddit.com${d.permalink}`,
          createdAt:   d.created_utc * 1000,
          score:       d.score,
          keywords:    matchedKeywords,
          highSignal:  isHighSignal,
          subreddit:   d.subreddit,
        });
      }

      // Polite delay between Reddit API calls
      await sleep(1000);
    } catch (err) {
      console.error(`[reddit] Error scraping ${query.url}:`, err.message);
    }
  }

  // Deduplicate by post ID
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
