/**
 * Script to run the app for N minutes with a steady debit of queries
 * Useful for running profilers
 */

/* Init ----------------------------------------------------------------------*/

const crypto = require('crypto');
const store = require('../../src')({
    getter: {
        method: require('../integration/utils/dao').getAssets,
    },
    uniqueOptions: ['language'],
    cache: { limit: 60000, steps: 5, base: 5000 },
    batch: { tick: 10, limit: 10 },
    retry: { base: 5 },
});
const testDuration = 10000;
const requestDelay = 3;
const sampleRange = 1;
let completed = 0;
let cacheHits = 0;
let sum = 0;
let timeouts = 0;
let batches = 0;
const startHeap = process.memoryUsage().heapUsed;

const languages = ['fr', 'en', 'pr', 'it', 'ge'];
const now = Date.now();

// store.on('cacheBump', console.log.bind(console, 'cacheBump'));
// store.on('cacheClear', console.log.bind(console, 'cacheClear'));
// store.on('retryCancelled', console.log.bind(console, 'retryCancelled'));
store.on('batch', () => { batches++; });
// store.on('batchSuccess', console.log.bind(console, 'batchSuccess'));
// store.on('batchFailed', console.log.bind(console, 'batchFailed'));
store.on('cacheHit', () => { cacheHits++; });
// store.on('cacheMiss', console.log.bind(console, 'cacheMiss'));

function hitStore() {
  if (Date.now() - now < testDuration) {
    setTimeout(hitStore, requestDelay);
    let finished = false;
    setTimeout(() => {
      if (finished === false) timeouts++;
    }, 500);
    const id = crypto.randomBytes(sampleRange).toString('hex');
    const language = languages[Math.floor(Math.random()*languages.length)];
    const before = Date.now();
    store.get(id, { language })
      .then((result) => {
        if (!result || result.id !== id || result.language !== language) {
          console.log(result, id, language);
          throw new Error('result mismatch');
        }
        sum += (Date.now() - before);
        finished = true;
        completed++;
      })
      .catch((err) => process.exit(1));
  }
  else {
    console.log(`${completed} completed requests\n${cacheHits} cache hits\n${JSON.stringify(store.size())}\n${timeouts} timed out\navg response time ${(sum / completed).toFixed(3)}\n${batches} batches sent\n${((process.memoryUsage().heapUsed - startHeap) / 1024).toFixed(2)} Kbytes allocated`)
    process.exit(0);
  }
}

hitStore();

