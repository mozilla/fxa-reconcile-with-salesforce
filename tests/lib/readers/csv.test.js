/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const path = require('path');
const TwoCSVReader = require('../../../lib/readers/csv');
const NullWriter = require('../../../lib/writers/null');

let csvReader;
let nullWriter;

let errorStub;

let counts;

beforeEach(() => {
  counts = {
    both: 0,
    left: 0,
    right: 0
  };
  errorStub = jest.fn();

  csvReader = new TwoCSVReader({
    highWaterMark: 16384,
    leftInputPath: path.join(__dirname, '..', '..', '..', 'test_data', 'salesforce_sorted.csv'),
    leftSource: 'sf',
    rightInputPath: path.join(__dirname, '..', '..', '..', 'test_data', 'fxa_sorted.csv'),
    rightSource: 'fxa',
    separator: ','
  });

  // the nullWriter is needed to ensure the reader's data queue
  // does not fill up.
  nullWriter = new NullWriter();
  csvReader.pipe(nullWriter);
  csvReader.on('error', errorStub);

  const origPush = csvReader.push;
  csvReader.push = jest.fn((data) => {
    if (data) {
      counts[data.type]++;
    }

    return origPush.call(csvReader, data);
  });
});

test('emits the expected number of events', () => {
  const expected = require('../../../test_data/expected.json');

  return new Promise((resolve, reject) => {
    csvReader.on('end', (completeCounts) => {
      resolve((() => {
        // Counts came from the data generator.
        expect(errorStub).toHaveBeenCalledTimes(expected.error);
        expect(counts.right).toBe(expected.create);
        expect(counts.left).toBe(expected.delete);
        expect(counts.both).toBe(expected.update + expected.ignore);
      })());
    });
  });
});
