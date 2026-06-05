// src/spikeDetector.js
// Tracks post counts per area over time.
// Computes a rolling baseline and fires when current volume exceeds it.

const { BASELINE_WINDOW_MINUTES, MIN_SPIKE_MULTIPLIER } = require('./config');

// Sliding window of post counts per area
// Shape: { areaName -> [{ ts, count }] }
const history = new Map();

// Record a batch of posts found for an area in this scrape cycle
function recordCount(areaName, count) {
  if (!history.has(areaName)) history.set(areaName, []);
  const arr = history.get(areaName);
  arr.push({ ts: Date.now(), count });

  // Trim entries older than 2x the baseline window
  const cutoff = Date.now() - BASELINE_WINDOW_MINUTES * 2 * 60 * 1000;
  const trimmed = arr.filter(e => e.ts > cutoff);
  history.set(areaName, trimmed);
}

// Compute the rolling average over the baseline window (excluding the most recent entry)
function computeBaseline(areaName) {
  const arr = history.get(areaName) || [];
  const cutoff = Date.now() - BASELINE_WINDOW_MINUTES * 60 * 1000;
  // Exclude the very last entry (that's current) from baseline
  const window = arr.slice(0, -1).filter(e => e.ts > cutoff);
  if (window.length === 0) return null;
  const sum = window.reduce((acc, e) => acc + e.count, 0);
  return sum / window.length;
}

// Returns spike multiplier if above threshold, or null if no spike
function detectSpike(areaName, currentCount) {
  // Need at least a few data points before we can call a spike
  const arr = history.get(areaName) || [];
  if (arr.length < 3) {
    return null; // not enough history yet
  }

  const baseline = computeBaseline(areaName);
  if (baseline === null || baseline < 1) {
    // Baseline too low to be meaningful — use absolute threshold
    return currentCount >= 10 ? { multiplier: 10, absolute: true } : null;
  }

  const multiplier = currentCount / baseline;
  if (multiplier >= MIN_SPIKE_MULTIPLIER) {
    return {
      multiplier: parseFloat(multiplier.toFixed(2)),
      baseline: parseFloat(baseline.toFixed(1)),
      current: currentCount,
      absolute: false,
    };
  }
  return null;
}

// Get full history for an area (for debugging)
function getHistory(areaName) {
  return history.get(areaName) || [];
}

module.exports = { recordCount, detectSpike, getHistory };
