const path = require('path');
const JSONReader = require('../../../lib/readers/json');

let jsonReader;
let counts;

beforeEach(() => {
  jsonReader = new JSONReader(
    path.join(__dirname, '..', '..', '..', 'test_data', 'commands.json')
  );

  counts = {
    create: 0,
    update: 0,
    delete: 0,
  };
});

test('emits the expected number of events', () => {
  return new Promise((resolve, reject) => {
    jsonReader.on('complete', (completeCounts) => {
      resolve((() => {
        expect(completeCounts.lines).toBe(1216);

        // Counts came from the data generator.
        expect(counts.create).toBe(1103);
        expect(completeCounts.create).toBe(1103);

        expect(counts.update).toBe(76);
        expect(completeCounts.update).toBe(76);

        expect(counts.delete).toBe(37);
        expect(completeCounts.delete).toBe(37);
      })());
    });

    jsonReader.on('create', () => counts.create++);
    jsonReader.on('update', () => counts.update++);
    jsonReader.on('delete', () => counts.delete++);

    jsonReader.run();
  });
});

