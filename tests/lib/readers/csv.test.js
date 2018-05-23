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
    update: 0,
    delete: 0,
    error: 0
  };
});

test('emits the expected number of events', () => {
  return new Promise((resolve, reject) => {
    csvReader.on('complete', (completeCounts) => {
      resolve((() => {
        // Counts came from the data generator.
        expect(counts.create).toBe(1018);
        expect(completeCounts.create).toBe(1018);

        expect(counts.update).toBe(81);
        expect(completeCounts.update).toBe(81);

        expect(counts.delete).toBe(46);
        expect(completeCounts.delete).toBe(46);

        expect(completeCounts.stats.sum).toBe('1145.00');
        expect(completeCounts.stats.mean).toBe('71.56');
        expect(completeCounts.stats.stddev).toBe('6.97');

        expect(completeCounts.ignore).toBe(2855);
      })());
    });

    csvReader.on('create', () => counts.create++);
    csvReader.on('update', () => counts.update++);
    csvReader.on('delete', () => counts.delete++);
    csvReader.on('error', () => counts.error++);

    csvReader.run();
  });
});

test('_splitLineBuffer, splits, trims', () => {
  const buffer = new Buffer('  uid,  email ,locale  ,createDate   ');
  expect(csvReader._splitLineBuffer(buffer)).toEqual([
    'uid',
    'email',
    'locale',
    'createDate'
  ]);
});


test('_splitLineBuffer, splits, trims and handles optional double-quoting', () => {
  const buffer = new Buffer('  uid,  email , " locale "  ,createDate   ');
  expect(csvReader._splitLineBuffer(buffer)).toEqual([
    'uid',
    'email',
    ' locale ',
    'createDate'
  ]);
});

test('_splitLineBuffer, splits, trims and handles locales with a comma', () => {
  const buffer = new Buffer('  uid,  email , "en,en-US"  ,createDate   ');
  expect(csvReader._splitLineBuffer(buffer)).toEqual([
    'uid',
    'email',
    'en,en-US',
    'createDate'
  ]);
});

test('_splitLineBuffer, splits, trims and handles optional double-quoting of empty string', () => {
  const buffer = new Buffer('  uid,  email , ""  ,createDate   ');
  expect(csvReader._splitLineBuffer(buffer)).toEqual([
    'uid',
    'email',
    '',
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

test('_normalizeCSVLocale trims locale', () => {
  expect(csvReader._normalizeCSVLocale('en')).toBe('en');
  expect(csvReader._normalizeCSVLocale('  en  ')).toBe('en');
  expect(csvReader._normalizeCSVLocale('  en,en-US  ')).toBe('en,en-US');
});

test('_parseFxaLine parses the line, normalizes input', () => {
  const lineData = csvReader._parseFxaLine(new Buffer('UID,Email,en-US , 1527087211213'), 1527087211210);
  expect(lineData.createDate).toEqual(new Date(1527087211213));
  expect(lineData.email).toBe('Email');
  expect(lineData.locale).toBe('en-US');
  expect(lineData.normalizedEmail).toBe('email');
  expect(lineData.normalizedUid).toBe('uid');
  expect(lineData.timestamp).toBe(1527087211210);
  expect(lineData.uid).toBe('UID');
});

test('_parseSalesforceLine parses the line, normalizes input', () => {
  const lineData = csvReader._parseSalesforceLine(new Buffer('UID,Email'), 1527087211210);
  expect(lineData.email).toBe('Email');
  expect(lineData.normalizedEmail).toBe('email');
  expect(lineData.normalizedUid).toBe('uid');
  expect(lineData.timestamp).toBe(1527087211210);
  expect(lineData.uid).toBe('UID');
});
