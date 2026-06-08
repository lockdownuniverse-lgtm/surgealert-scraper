// src/sources/rss.js
// Local news RSS feed scraper — free, no API key, high signal quality
// One confirmed news article about a crowd incident outweighs 10 random tweets

const axios = require('axios');
const { CROWD_KEYWORDS, HIGH_SIGNAL_KEYWORDS } = require('../config');

// RSS feeds by city — add as many as you want
const CITY_FEEDS = {
  'Chicago': [
    'https://www.chicagotribune.com/arcio/rss/',
    'https://wgntv.com/feed/',
    'https://www.nbcchicago.com/feed/',
    'https://chicago.cbslocal.com/feed/',
    'https://abc7chicago.com/feed/',
    'https://cwbchicago.com/feed',
    'https://blockclubchicago.org/feed/',
  ],
  'New York': [
    'https://nypost.com/feed/',
    'https://gothamist.com/feed',
    'https://www.silive.com/rss/index.xml',
    'https://www.amny.com/feed/',
  ],
  'Los Angeles': [
    'https://www.latimes.com/rss2.0.xml',
    'https://laist.com/feed',
    'https://www.cbsnews.com/los-angeles/rss/',
  ],
  'Houston': [
    'https://www.chron.com/rss/feed/Houston-News-2203.php',
    'https://www.houstonpublicmedia.org/feed/',
  ],
  'Atlanta': [
    'https://www.ajc.com/rss/crime/',
    'https://www.wsbtv.com/rss',
  ],
  'Miami': [
    'https://www.miamiherald.com/news/local/?widgetName=rssfeed&widgetContentId=712015&getXmlFeed=true',
    'https://www.local10.com/rss',
  ],
  'Dallas': [
    'https://www.dallasnews.com/arc/outboundfeeds/rss/',
    'https://www.wfaa.com/feeds/syndication/rss/news',
  ],
  'Philadelphia': [
    'https://www.inquirer.com/arcio/rss/',
    'https://whyy.org/feed/',
  ],
  'Phoenix': [
    'https://www.azcentral.com/arcio/rss/',
    'https://www.abc15.com/rss',
  ],
  'San Antonio': [
    'https://www.mysanantonio.com/rss/feed/San-Antonio-News-741.php',
  ],
  'Indianapolis': [
    'https://www.indystar.com/rss/news/',
    'https://fox59.com/feed/',
  ],
  'Memphis': [
    'https://www.commercialappeal.com/rss/news/',
    'https://www.localmemphis.com/rss',
  ],
  'St Louis': [
    'https://www.stltoday.com/search/?f=rss&t=article&c=news',
    'https://fox2now.com/feed/',
  ],
};

// Map area names to city keys
const AREA_TO_CITY = {
  'Chicago Downtown':    'Chicago',
  'Chicago Wicker Park': 'Chicago',
  'Chicago Navy Pier':   'Chicago',
  'New York Times Square':'New York',
  'New York Brooklyn':   'New York',
  'Los Angeles Hollywood':'Los Angeles',
  'Los Angeles Downtown':'Los Angeles',
  'Houston Downtown':    'Houston',
  'Atlanta Downtown':    'Atlanta',
  'Miami Downtown':      'Miami',
  'Dallas Downtown':     'Dallas',
  'Philadelphia Downtown':'Philadelphia',
  'Phoenix Downtown':    'Phoenix',
  'San Antonio Riverwalk':'San Antonio',
  'Indianapolis Downtown':'Indianapolis',
  'Memphis Downtown':    'Memphis',
  'St Louis Downtown':   'St Louis',
};

// Simple RSS parser without external library
async function fetchFeed(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'SurgeAlertBot/1.0 (crowd safety monitoring)' },
    });
    
    // Extract items from RSS XML
    const items = [];
    const itemMatches = data.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    for (const item of itemMatches) {
      const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                     item.match(/<title>(.*?)<\/title>/))?.[1] || '';
      const desc  = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
                     item.match(/<description>(.*?)<\/description>/))?.[1] || '';
      const link  = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const guid  = item.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] || link;
      
      if (title) items.push({ title, desc, link, guid });
    }
    
    return items;
  } catch (err) {
    // Silently fail — RSS feeds go down all the time
    return [];
  }
}

async function scrapeArea(area) {
  const cityKey = AREA_TO_CITY[area.name];
  if (!cityKey) return [];
  
  const feeds = CITY_FEEDS[cityKey] || [];
  const allKeywords = [...CROWD_KEYWORDS, ...HIGH_SIGNAL_KEYWORDS];
  const results = [];
  
  for (const feedUrl of feeds) {
    const items = await fetchFeed(feedUrl);
    
    for (const item of items) {
      const text = `${item.title} ${item.desc}`.toLowerCase();
      const matchedKeywords = allKeywords.filter(k => text.includes(k.toLowerCase()));
      
      if (matchedKeywords.length === 0) continue;
      
      const isHighSignal = HIGH_SIGNAL_KEYWORDS.some(k => text.includes(k.toLowerCase()));
      
      results.push({
        platform:   'rss',
        id:         item.guid || item.link,
        text:       item.title,
        url:        item.link,
        createdAt:  Date.now(),
        keywords:   matchedKeywords,
        highSignal: isHighSignal,
        source:     feedUrl,
      });
    }
  }
  
  // Deduplicate by id
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

module.exports = { scrapeArea };
