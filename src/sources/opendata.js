// src/sources/opendata.js
// City open data APIs using Socrata SODA format
// Free, no API key required, works for most major US cities
// Filters for crowd-related incident types near monitored areas

const axios = require('axios');

// Crime types that indicate crowd surge activity
const CROWD_CRIME_TYPES = [
  'MOB ACTION',
  'RIOT',
  'DISORDERLY CONDUCT',
  'INTERFERENCE WITH PUBLIC OFFICER',
  'ASSAULT',
  'BATTERY',
  'ROBBERY',
  'CRIMINAL TRESPASS',
];

// High signal crime types
const HIGH_SIGNAL_TYPES = [
  'MOB ACTION',
  'RIOT',
];

// Socrata SODA city configs
// Each city uses the same API format with different dataset IDs
const CITY_APIS = {
  'Chicago': {
    endpoint: 'https://data.cityofchicago.org/resource/ijzp-q8t2.json',
    latField: 'latitude',
    lonField: 'longitude',
    typeField: 'primary_type',
    dateField: 'date',
    descField: 'description',
    locationField: 'block',
  },
  'New York': {
    endpoint: 'https://data.cityofnewyork.us/resource/5uac-w243.json',
    latField: 'latitude',
    lonField: 'longitude',
    typeField: 'ofns_desc',
    dateField: 'cmplnt_fr_dt',
    descField: 'crm_atpt_cptd_cd',
    locationField: 'boro_nm',
  },
  'Los Angeles': {
    endpoint: 'https://data.lacity.org/resource/2nrs-mtv8.json',
    latField: 'lat',
    lonField: 'lon',
    typeField: 'crm_cd_desc',
    dateField: 'date_occ',
    descField: 'crm_cd_desc',
    locationField: 'location',
  },
  'Philadelphia': {
    endpoint: 'https://phl.carto.com/api/v2/sql?q=SELECT+*+FROM+incidents_part1_part2+ORDER+BY+dispatch_date+DESC+LIMIT+100&format=json',
    custom: true,
  },
  'Atlanta': {
    endpoint: 'https://opendata.atlantapd.org/resource/gdmp-gm9g.json',
    latField: 'latitude',
    lonField: 'longitude',
    typeField: 'uc2_literal',
    dateField: 'report_date',
    descField: 'neighborhood',
    locationField: 'neighborhood',
  },
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
  'Atlanta Downtown':    'Atlanta',
  'Philadelphia Downtown':'Philadelphia',
};

// Haversine distance in km
function distKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function fetchIncidents(cityConfig, area, windowMin = 30) {
  try {
    const since = new Date(Date.now() - windowMin * 60 * 1000).toISOString();
    const { endpoint, latField, lonField, typeField, dateField } = cityConfig;

    const params = {
      '$limit': 100,
      '$order': `${dateField} DESC`,
      '$where': `${dateField} >= '${since}'`,
    };

    const { data } = await axios.get(endpoint, { params, timeout: 10000 });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`[opendata] ${area.name} fetch failed: ${err.message}`);
    return [];
  }
}

async function scrapeArea(area) {
  const cityKey = AREA_TO_CITY[area.name];
  if (!cityKey) return [];

  const cityConfig = CITY_APIS[cityKey];
  if (!cityConfig || cityConfig.custom) return [];

  const incidents = await fetchIncidents(cityConfig, area);
  const results = [];

  for (const inc of incidents) {
    const lat = parseFloat(inc[cityConfig.latField]);
    const lon = parseFloat(inc[cityConfig.lonField]);
    if (isNaN(lat) || isNaN(lon)) continue;

    // Check if within 2km of monitored area
    const dist = distKm(area.lat, area.lon, lat, lon);
    if (dist > 2.0) continue;

    const type = (inc[cityConfig.typeField] || '').toUpperCase();
    if (!CROWD_CRIME_TYPES.some(t => type.includes(t))) continue;

    const isHighSignal = HIGH_SIGNAL_TYPES.some(t => type.includes(t));
    const id = inc.id || inc.case_number || `${lat}-${lon}-${inc[cityConfig.dateField]}`;

    results.push({
      platform:   'opendata',
      id,
      text:       `${type}: ${inc[cityConfig.descField] || ''} near ${inc[cityConfig.locationField] || area.name}`,
      url:        null,
      createdAt:  Date.now(),
      keywords:   [type.toLowerCase()],
      highSignal: isHighSignal,
      distKm:     dist.toFixed(2),
      citySource: cityKey,
    });
  }

  if (results.length > 0) {
    console.log(`[opendata] ${area.name} → ${results.length} crowd incidents`);
  }

  return results;
}

module.exports = { scrapeArea };
