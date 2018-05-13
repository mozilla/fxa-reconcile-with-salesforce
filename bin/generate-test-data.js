/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const fs = require('fs');
const path = require('path');
const program = require('commander');
const uuid = require('node-uuid');

const StdOutOutput = require('../lib/output/stdout');

program
  .option('-c, --count <count>', 'Total record count')
  .option('-f, --fxa [filename]', 'FxA CSV')
  .option('-s, --salesforce [filename]', 'Salesforce CSV');

program.parse(process.argv);

const count = parseInt(program.count);

const fxaWriter = createFxaWriter(program);
const salesforceWriter = createSalesforceWriter(program);
generate(count, 10, 10, 5, fxaWriter, salesforceWriter)
  .then((counts) => {
    let total = counts.both + counts.changed + counts.fxaOnly + counts.salesforceOnly;
    counts.total = total;
    console.log('Counts:\n', JSON.stringify(counts, null, 2));
  });

async function generate(count, percentFxaOnly, percentSalesforceOnly, percentChange, fxaStream, salesforceStream) {
  const salesforceMaxThreshold = percentFxaOnly + percentSalesforceOnly;
  const changeMaxThreshold = salesforceMaxThreshold + percentChange;
  const counts = {
    fxaOnly: 0,
    salesforceOnly: 0,
    changed: 0,
    both: 0,
  };

  for (let i = 0; i < count; ++i) {
    const uid = uuid.v4().replace(/-/g, '');
    const number = Math.floor(Math.random() * 100);

    if (number <= percentFxaOnly) {
      // in FxA only.
      await write(fxaStream, `${uid},${uid}@fxa.com,en\n`);
      counts.fxaOnly++;
    } else if (number <= salesforceMaxThreshold) {
      // in Salesforce only
      await write(salesforceStream, `${uid},${uid}@salesforce.com\n`);
      counts.salesforceOnly++;
    } else if (number <= changeMaxThreshold) {
      // in both, changed in FxA.
      await write(fxaStream, `${uid},${uid}@changed.com,en\n`);
      await write(salesforceStream, `${uid},${uid}@original.com\n`);
      counts.changed++;
    } else {
      // same in both.
      await write(fxaStream, `${uid},${uid}@same.com,en\n`);
      await write(salesforceStream, `${uid},${uid}@same.com\n`);
      counts.both++;
    }
  }

  return counts;
}

function write(outputStream, contents) {
  return new Promise((resolve, reject) => {
    const ok = outputStream.write(contents);

    if (! ok) {
      outputStream.once('drain', () => resolve());
    } else {
      resolve();
    }
  });
}

function createFxaWriter (program) {
  if (! program.fxa) {
    return new StdOutOutput('fxa       : ', '\n');
  } else {
    const outputPath = path.resolve(process.cwd(), program.fxa);
    return fs.createWriteStream(outputPath);
  }
}
function createSalesforceWriter (program) {
  if (! program.salesforce) {
    return new StdOutOutput('salesforce: ', '\n');
  } else {
    const outputPath = path.resolve(process.cwd(), program.salesforce);
    return fs.createWriteStream(outputPath);
  }
}