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
  };
});

it('emits the expected number of events', () => {
  return new Promise((resolve, reject) => {
    csvReader.on('complete', () => {
      resolve((() => {
        // These numbers came from the data generator.
        expect(counts.create).toBe(197);
        expect(counts.update).toBe(65);
        expect(counts.delete).toBe(674);
      })());
    });

    csvReader.on('create', () => counts.create++);
    csvReader.on('update', () => counts.update++);
    csvReader.on('delete', () => counts.delete++);

    csvReader.run();
  });
});