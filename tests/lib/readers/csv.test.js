const path = require('path');
const CSVReader = require('../../../lib/readers/csv');

let csvReader;
let counts;

beforeEach(() => {
  csvReader = new CSVReader(
    path.join(__dirname, '..', '..', '..', 'test_data', 'fxa_sorted.csv'),
    path.join(__dirname, '..', '..', '..', 'test_data', 'salesforce_sorted.csv'),
    ','
  );

  counts = {
    create: 0,
    delete: 0,
    error: 0,
    update: 0,
  };
});

test('emits the expected number of events', () => {
  const expected = {
    create: 1078,
    delete: 40,
    error: 49,
    ignore: 2772,
    update: 61,
    stats: {
      sum: '1179.00',
      mean: '73.69',
      stddev: '9.09'
    }
  }

  return new Promise((resolve, reject) => {
    csvReader.on('complete', (completeCounts) => {
      resolve((() => {
        // Counts came from the data generator.
        expect(counts.create).toBe(expected.create);
        expect(completeCounts.create).toBe(expected.create);

        expect(counts.delete).toBe(expected.delete);
        expect(completeCounts.delete).toBe(expected.delete);

        expect(counts.error).toBe(expected.error);

        expect(counts.update).toBe(expected.update);
        expect(completeCounts.update).toBe(expected.update);

        expect(completeCounts.stats.sum).toBe(expected.stats.sum);
        expect(completeCounts.stats.mean).toBe(expected.stats.mean);
        expect(completeCounts.stats.stddev).toBe(expected.stats.stddev);

        expect(completeCounts.ignore).toBe(expected.ignore);
      })());
    });

    csvReader.on('create', () => counts.create++);
    csvReader.on('delete', () => counts.delete++);
    csvReader.on('error', () => counts.error++);
    csvReader.on('update', () => counts.update++);

    csvReader.run();
  });
});

test('_splitLineBuffer, splits, trims and base64-decodes email and locale', () => {
  const email = 'someone@example.com';
  const locale = 'en-US,en;q=0.9';
  const base64email = Buffer.from(email, 'utf8').toString('base64');
  const base64locale = Buffer.from(locale, 'utf8').toString('base64');
  const buffer = new Buffer(` uid,  ${base64email} ,  ${base64locale},createDate `);
  expect(csvReader._splitLineBuffer(buffer, 'fxa')).toEqual([
    'uid',
    email,
    locale,
    'createDate'
  ]);
});

test('_splitLineBuffer returns ["zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"] if no buffer', () => {
  expect(csvReader._splitLineBuffer()).toEqual([
    'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'
  ]);
});

test('_normalizeCSVDate converts a string to a date', () => {
  let date = csvReader._normalizeCSVDate('1473453024553');
  expect(date.getTime()).toBe(1473453024553);
});
