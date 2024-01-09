const Bottleneck = require('bottleneck');

function createLimiter(minTime = 3000) {
  return new Bottleneck({
    minTime, // minimum time between jobs
  });
}

module.exports = createLimiter;
