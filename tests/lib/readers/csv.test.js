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
  const expected = require('../../../test_data/expected.json');

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

test('_splitLineBuffer, splits, trims', () => {
  const base64email = utf8ToBase64('someone@example.com');
  const base64locale = utf8ToBase64('en-US,en;q=0.9');
  const buffer = new Buffer(` uid,  ${base64email} ,  ${base64locale},createDate `);
  expect(csvReader._splitLineBuffer(buffer)).toEqual([
    'uid',
    base64email,
    base64locale,
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

test('_normalizeFxaCSVLocale trims locale', () => {
  expect(csvReader._normalizeFxaCSVLocale(utf8ToBase64('en'))).toBe('en');
  expect(csvReader._normalizeFxaCSVLocale(utf8ToBase64('  en  '))).toBe('en');
  expect(csvReader._normalizeFxaCSVLocale(utf8ToBase64('  en,en-US  '))).toBe('en,en-US');
});

test('_normalizeFxaCSVEmail trims email', () => {
  expect(csvReader._normalizeFxaCSVEmail(utf8ToBase64('someone@someone.com'))).toBe('someone@someone.com');
  expect(csvReader._normalizeFxaCSVEmail(utf8ToBase64(' someone@someone.com '))).toBe('someone@someone.com');
});

test('_parseFxaLine parses the line, normalizes input', () => {
  const lineData = csvReader._parseFxaLine(new Buffer(`UID,${utf8ToBase64('testuser@testuser.com')},${utf8ToBase64('en-US ')} , 1527087211213`), 1527087211210);
  expect(lineData.createDate).toEqual(new Date(1527087211213));
  expect(lineData.email).toBe('testuser@testuser.com');
  expect(lineData.locale).toBe('en-US');
  expect(lineData.timestamp).toBe(1527087211210);
  expect(lineData.uid).toBe('UID');
});

test('_parseSalesforceLine parses the line, normalizes input', () => {
  const lineData = csvReader._parseSalesforceLine(new Buffer('UID,Email'), 1527087211210);
  expect(lineData.email).toBe('Email');
  expect(lineData.timestamp).toBe(1527087211210);
  expect(lineData.uid).toBe('UID');
});

function utf8ToBase64 (str) {
  return Buffer.from(str, 'utf8').toString('base64');
}
