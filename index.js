// index.js
require('dotenv').config();
const express = require('express');
const { start, runOnce } = require('./src/scraper');
const { getHistory }     = require('./src/spikeDetector');
const config             = require('./src/config');

const app  = express();
const PORT = process.env.SCRAPER_PORT || 3002;

app.use(express.json());

// Health check + status
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    areas:   config.MONITORED_AREAS.map(a => a.name),
    sources: config.SOURCES,
    cron:    config.SCRAPE_INTERVAL_CRON,
  });
});

// Debug: view spike history for an area
app.get('/history/:area', (req, res) => {
  const history = getHistory(req.params.area);
  res.json({ area: req.params.area, history });
});

// Manual trigger (useful for testing)
app.post('/trigger', async (req, res) => {
  console.log('[scraper] Manual trigger via API');
  runOnce().catch(console.error);
  res.json({ triggered: true });
});

app.listen(PORT, () => {
  console.log(`SurgeAlert Scraper health server on port ${PORT}`);
});

// Start the scraper
start();
