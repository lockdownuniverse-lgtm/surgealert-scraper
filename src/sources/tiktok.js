// src/sources/tiktok.js
const axios = require('axios');
const { CROWD_KEYWORDS, HIGH_SIGNAL_KEYWORDS } = require('../config');

const SOCIAVAULT_KEY = process.env.SOCIAVAULT_API_KEY || '';
const BASE_URL = 'https://api.sociavault.com/v1/scrape/tiktok/search/keyword';

const CITY_QUERIES = {
  'Chicago':      ['teen takeover chicago', 'mob action chicago'],
  'New York':     ['teen takeover new york', 'crowd surge nyc'],
  'Los Angeles':  ['teen takeover los angeles', 'mob action LA'],
  'Houston':      ['teen takeover houston'],
  'Atlanta':      ['teen takeover atlanta'],
  'Miami':        ['teen takeover miami'],
  'Dallas':       ['teen takeover dallas'],
  'Philadelphia': ['teen takeover philly'],
  'Phoenix':      ['teen takeover phoenix'],
  'San Antonio':  ['teen takeover san antonio'],
  'Indianapolis': ['teen takeover indianapolis'],
  'Memphis':      ['teen takeover memphis'],
  'St Louis':     ['teen takeover st louis'],
};

const AREA_TO_CITY = {
  'Chicago Downtown':     'Chicago',
  'Chicago Wicker Park':  'Chicago',
  'Chicago Navy Pier':    'Chicago',
  'New York Times Square':'New York',
  'New York Brooklyn':    'New York',
  'Los Angeles Hollywood':'Los Angeles',
  'Los Angeles Downtown': 'Los Angeles',
  'Houston Downtown':     'Houston',
  'Atlanta Downtown':     'Atlanta',
  'Miami Downtown':       'Miami',
  'Dallas Downtown':      'Dallas',
  'Philadelphia Downtown':'Philadelphia',
  'Phoenix Downtown':     'Phoenix',
  'San Antonio Riverwalk':'San Antonio',
  'Indianapolis Downtown':'Indianapolis',
  'Memphis Downtown':     'Memphis',
  'St Louis Downtown':    'St Louis',
};

const searched = new Set();

async function searchKeyword(query) {
  try {
    const { data } = await axios.get(BASE_URL, {
      params: { query, date_posted: 'this-week', sort_by: 'date-posted' },
      headers: { 'x-api-key': SOCIAVAULT_KEY },
      timeout: 15000,
    });
    const items = data?.data?.search_item_list || {};
    return Object.values(items).map(item => item.aweme_info).filter(Boolean);
  } catch (err) {
    console.warn('[tiktok] Search failed for "' + query + '": ' + err.message);
    return [];
  }
}

async function scrapeArea(area) {
  if (!SOCIAVAULT_KEY) return [];
  const cityKey = AREA_TO_CITY[area.name];
  if (!cityKey) return [];
  if (searched.has(cityKey)) return [];
  searched.add(cityKey);
  setTimeout(() => searched.delete(cityKey), 5 * 60 * 1000);

  const queries = (CITY_QUERIES[cityKey] || []).slice(0, 2);
  const allKeywords = [...CROWD_KEYWORDS, ...HIGH_SIGNAL_KEYWORDS];
  const results = [];
  const seen = new Set();

  for (const query of queries) {
    const videos = await searchKeyword(query);
    for (const video of videos) {
      const desc = video.desc || '';
      const text = desc.toLowerCase();
      const matchedKeywords = allKeywords.filter(k => text.includes(k.toLowerCase()));
      if (matchedKeywords.length === 0) continue;
      const id = video.aweme_id || video.group_id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const isHighSignal = HIGH_SIGNAL_KEYWORDS.some(k => text.includes(k.toLowerCase()));
      results.push({
        platform: 'tiktok',
        id,
        text: desc.substring(0, 200),
        url: video.share_info?.share_url || '',
        createdAt: (video.create_time || Date.now() / 1000) * 1000,
        keywords: matchedKeywords,
        highSignal: isHighSignal,
        author: video.author?.unique_id || 'unknown',
        plays: video.statistics?.play_count || 0,
      });
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  if (results.length > 0) {
    console.log('[tiktok] ' + area.name + ' -> ' + results.length + ' crowd videos found');
  }
  return results;
}

module.exports = { scrapeArea };
