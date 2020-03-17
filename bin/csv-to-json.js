/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const fs = require('fs');
const path = require('path');
const program = require('commander');

const TwoCSVReader = require('../lib/readers/csv');
const JSONTransform = require('../lib/transforms/json');
const FxaAndSalesforceReconcilingStream = require('../lib/reconcilers/fxa-and-salesforce');
const StreamManager = require('../lib/reconcilers/stream-manager');

program
  .option('-f, --fxa <filename>', 'FxA CSV, format expected to be `uid,email,locale`')
  .option('-h, --highwater [N]', 'High water mark, defaults to 16384. See https://nodejs.org/api/stream.html#stream_constructor_new_stream_writable_options')
  .option('-s, --salesforce <filename>', 'Salesforce CSV, format expected to be `uid,email`');

program.parse(process.argv);

const programName = path.basename(process.argv[1]);

function usage () {
  console.log(`Usage:
  node ${programName} -f <fxa_csv_filename> -s <salesforce_csv_filename>
`);
}

if (! program.fxa || ! program.salesforce) {
  usage();
  process.exit(1);
}

const highWaterMark = parseInt(program.highwater || 16384, 10);

const fxaInputPath = path.resolve(process.cwd(), program.fxa);
const salesforceInputPath = path.resolve(process.cwd(), program.salesforce);
const readingStream = new TwoCSVReader({
  highWaterMark,
  leftInputPath: salesforceInputPath,
  leftSource: 'sf',
  rightInputPath: fxaInputPath,
  rightSource: 'fxa',
  separator: ','
});


const reconcilingStream = new FxaAndSalesforceReconcilingStream({
  highWaterMark,
  timestamp: getTimestamp(fxaInputPath)
});

const outputStream = process.stdout;

readingStream.pipe(reconcilingStream).pipe(new JSONTransform({ highWaterMark, suffix: '\n' })).pipe(outputStream);

void new StreamManager(readingStream, outputStream, reconcilingStream, process.stdout);

function getTimestamp (inputPath) {
  const stats = fs.statSync(inputPath);
  return new Date(stats.ctimeMs);
}

