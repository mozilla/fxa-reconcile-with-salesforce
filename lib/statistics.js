
const buckets = { '0': 0, '1': 0, '2': 0, '3': 0,
                  '4': 0, '5': 0, '6': 0, '7': 0,
                  '8': 0, '9': 0, 'a': 0, 'b': 0,
                  'c': 0, 'd': 0, 'e': 0, 'f': 0 };

function updateBucketStats (uid) {
  const bucketKey = uid[0];
  const keys = Object.keys(buckets);
  if (! keys.includes(bucketKey)) {
    console.error('All bucket keys are a-f0-9', bucketKey);
    return;
  }
  buckets[bucketKey] += 1;
}

function calculateBucketDistribution () {
  const bucketKeys = Object.keys(buckets);
  const sum = bucketKeys.reduce((sum, key) => sum + buckets[key], 0);
  const mean = sum / bucketKeys.length;
  const reducer = (sum, val) => sum + (buckets[val] - mean) ** 2;
  const sumOfSquares = bucketKeys.reduce(reducer, 0);
  const variance = sumOfSquares / bucketKeys.length;
  const stddev = Math.sqrt(variance);

  return {
    sum: sum.toFixed(2),
    mean: mean.toFixed(2),
    stddev: stddev.toFixed(2)
  };
}

module.exports = {
  updateBucketStats: updateBucketStats,
  calculateBucketDistribution: calculateBucketDistribution
};
