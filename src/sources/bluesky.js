// src/sources/bluesky.js
// Bluesky AT Protocol public search API
// No API key needed, no rate limits on public searches, completely free

const axios = require('axios');
const { CROWD_KEYWORDS, HIGH_SIGNAL_KEYWORDS } = require('../config');

const BSKY_API = 'https://public.api.bsky.app/xrpc';

async function searchPosts(query, limit = 25) {
  try {
    const { data } = await axios.get(`${BSKY_API}/app.bsky.feed.searchPosts`, {
      params: { q: query, limit },
      timeout: 8000,
      headers: { 'Accept': 'application/json' },
    });
    return data.posts || [];
  } catch (err) {
    console.warn(`[bluesky] Search failed for "${query}": ${err.message}`);
    return [];
  }
}

async function scrapeArea(area) {
  const results = [];
  const allKeywords = [...CROWD_KEYWORDS, ...HIGH_SIGNAL_KEYWORDS];

  // Build search queries combining high-signal keywords with city name
  const queries = [
    `${area.name} crowd`,
    `${area.name} mob`,
    `${area.name} surge`,
    `teen takeover ${area.name}`,
  ];

  for (const query of queries) {
    const posts = await searchPosts(query);

    for (const post of posts) {
      const text = (post.record?.text || '').toLowerCase();
      const matchedKeywords = allKeywords.filter(k => text.includes(k.toLowerCase()));

      if (matchedKeywords.length === 0) continue;

      const isHighSignal = HIGH_SIGNAL_KEYWORDS.some(k => text.includes(k.toLowerCase()));
      const uri = post.uri || '';
      const id  = uri.split('/').pop() || Math.random().toString();

      results.push({
        platform:   'bluesky',
        id,
        text:       post.record?.text || '',
        url:        `https://bsky.app/profile/${post.author?.handle}/post/${id}`,
        createdAt:  Date.now(),
        keywords:   matchedKeywords,
        highSignal: isHighSignal,
        author:     post.author?.handle,
        likeCount:  post.likeCount || 0,
      });
    }

    // Polite delay between requests
    await new Promise(r => setTimeout(r, 500));
  }

  // Deduplicate
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

module.exports = { scrapeArea };
