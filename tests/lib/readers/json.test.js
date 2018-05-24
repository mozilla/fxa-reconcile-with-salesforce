const path = require('path');
const JSONReader = require('../../../lib/readers/json');
const NullWriter = require('../../../lib/writers/null');

let jsonReader;
let counts;

beforeEach(() => {
  jsonReader = new JSONReader({
    inputPath: path.join(__dirname, '..', '..', '..', 'test_data', 'commands.json')
  });

  const nullWriter = new NullWriter();
  jsonReader.pipe(nullWriter);
});

test('emits the expected number of events', () => {
  return new Promise((resolve, reject) => {
    jsonReader.on('complete', (counts) => {
      resolve((() => {
        // Counts came from the data generator.
        expect(counts.lines).toBe(1216);
        expect(counts.create).toBe(1103);
        expect(counts.update).toBe(76);
        expect(counts.delete).toBe(37);
      })());
    });
  });
});

