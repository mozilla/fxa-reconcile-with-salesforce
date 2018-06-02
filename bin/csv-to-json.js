/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const path = require('path');
const program = require('commander');

const CSVReader = require('../lib/readers/csv');
const JSONTransform = require('../lib/transforms/json');
const ReconciliationManager = require('../lib/index');

program
  .option('-f, --fxa [filename]', 'FxA CSV, format expected to be `uid,email,locale`')
  .option('-s, --salesforce [filename]', 'Salesforce CSV, format expected to be `uid,email`');

program.parse(process.argv);

function usage () {
  console.log(`Usage:
  csv-to-json -f <fxa_csv_filename> -s <salesforce_csv_filename>
`);
}

if (! program.fxa || ! program.salesforce) {
  usage();
  process.exit(1);
}


const fxaInputPath = path.resolve(process.cwd(), program.fxa);
const salesforceInputPath = path.resolve(process.cwd(), program.salesforce);
const reader = new CSVReader({
  fxaInputPath,
  salesforceInputPath,
  separator: ','
});

reader.pipe(new JSONTransform({ suffix: '\n' })).pipe(process.stdout);

const reconciler = new ReconciliationManager(reader, process.stdout); // eslint-disable-line no-unused-vars

