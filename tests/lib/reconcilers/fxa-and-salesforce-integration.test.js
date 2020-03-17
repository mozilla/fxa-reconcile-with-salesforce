/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const path = require('path');

const FxaAndSalesforceReconcilingStream = require('../../../lib/reconcilers/fxa-and-salesforce');
const StreamManager = require('../../../lib/reconcilers/stream-manager');
const TwoCSVReader = require('../../../lib/readers/csv');
const NullWriter = require('../../../lib/writers/null');

const TIMESTAMP = 1527087211210;
const expected = require('../../../test_data/expected.json');

test('emits the expected number of events', () => {
  return new Promise((resolve, reject) => {
    const csvReaderStream = new TwoCSVReader({
      highWaterMark: 16384,
      leftInputPath: path.join(__dirname, '..', '..', '..', 'test_data', 'salesforce_sorted.csv'),
      leftSource: 'sf',
      rightInputPath: path.join(__dirname, '..', '..', '..', 'test_data', 'fxa_sorted.csv'),
      rightSource: 'fxa',
      separator: ','
    });
    const counterStream = new FxaAndSalesforceReconcilingStream({
      highWaterMark: 16384,
      timestamp: TIMESTAMP
    });
    const writerStream = new NullWriter();
    const errorStream = new NullWriter();

    const manager = new StreamManager(csvReaderStream, writerStream, counterStream, errorStream); // eslint-disable-line no-unused-vars

    manager.on('complete', (completeCounts) => {
      resolve((() => {
        //const completeCounts = counterStream.counts;
        // Counts came from the data generator.
        expect(completeCounts.error).toBe(expected.error);
        expect(completeCounts.verified).toBe(expected.create);
        expect(completeCounts.delete).toBe(expected.delete);
        expect(completeCounts.ignore).toBe(expected.ignore);
        expect(completeCounts.primaryEmailChanged).toBe(expected.update);
        expect(completeCounts.stats.sum).toBe(expected.stats.sum);
        expect(completeCounts.stats.mean).toBe(expected.stats.mean);
        expect(completeCounts.stats.stddev).toBe(expected.stats.stddev);
      })());
    });

    csvReaderStream.pipe(counterStream).pipe(writerStream);
  });
});
