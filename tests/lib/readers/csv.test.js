const path = require('path');
const CSVReader = require('../../../lib/readers/csv');
const NullWriter = require('../../../lib/writers/null');

let csvReader;
let counts;
let nullWriter;

beforeEach(() => {
  csvReader = new CSVReader({
    fxaInputPath: path.join(__dirname, '..', '..', '..', 'test_data', 'fxa_sorted.csv'),
    salesforceInputPath: path.join(__dirname, '..', '..', '..', 'test_data', 'salesforce_sorted.csv'),
    separator: ','
  });

  // the nullWriter is needed to ensure the reader's data queue
  // does not fill up.
  nullWriter = new NullWriter();
  csvReader.pipe(nullWriter);
  csvReader.on('error', () => {
    counts.error++;
  });

  counts = {
    error: 0,
  };
});

test('emits the expected number of events', () => {
  const expected = {
    create: 1103,
    delete: 37,
    error: 43,
    ignore: 2741,
    update: 76,
    stats: {
      sum: '1216.00',
      mean: '76.00',
      stddev: '7.52'
    }
  }

  return new Promise((resolve, reject) => {
    csvReader.on('complete', (completeCounts) => {
      resolve((() => {
        // Counts came from the data generator.
        expect(counts.error).toBe(expected.error);
        expect(completeCounts.create).toBe(expected.create);
        expect(completeCounts.delete).toBe(expected.delete);
        expect(completeCounts.ignore).toBe(expected.ignore);
        expect(completeCounts.update).toBe(expected.update);
        expect(completeCounts.stats.sum).toBe(expected.stats.sum);
        expect(completeCounts.stats.mean).toBe(expected.stats.mean);
        expect(completeCounts.stats.stddev).toBe(expected.stats.stddev);
      })());
    });
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