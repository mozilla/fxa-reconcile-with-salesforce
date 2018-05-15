/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const path = require('path');
const program = require('commander');

const CSVReader = require('../lib/readers/csv');
const JSONWriter = require('../lib/writers/json');
const ReconciliationManager = require('../lib/index');
const StdoutOutput = require('../lib/output/stdout');

program
  .option('-f, --fxa [filename]', 'FxA CSV, format expected to be `uid,email,locale`')
  .option('-s, --salesforce [filename]', 'Salesforce CSV, format expected to be `uid,email`')


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


let reader;
if (program.fxa) {
  const fxaInputPath = path.resolve(process.cwd(), program.fxa);
  const salesforceInputPath = path.resolve(process.cwd(), program.salesforce);
  reader = new CSVReader(fxaInputPath, salesforceInputPath, ',');
}

const output = new StdoutOutput();
const writer = new JSONWriter(output);

const reconciler = new ReconciliationManager(reader, writer);
reconciler.run();