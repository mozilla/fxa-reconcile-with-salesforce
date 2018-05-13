/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const path = require('path');
const program = require('commander');

const CSVReader = require('../lib/readers/csv-reader');
const DiffReader = require('../lib/readers/diff-reader');
const JSONWriter = require('../lib/writers/json');
const ReconciliationManager = require('../lib/index');
const SQSOutput = require('../lib/output/sqs');
const SQSWriter = require('../lib/writers/sqs');
const StdoutOutput = require('../lib/output/stdout');
const NullOutput = require('../lib/output/null');

program
  .option('-d, --diff [filename]', 'Diff file')
  .option('-f, --fxa [filename]', 'FxA CSV, format expected to be `uid,email,locale`')
  .option('-s, --salesforce [filename]', 'Salesforce CSV, format expected to be `uid,email`')
  .option('-n, --null', 'No output')
  .option('-j, --json', 'Write JSON output')
  .option('-u, --url <SQS_url>', 'SQS URL')
  .option('-r, --region <AWS_region>', 'AWS Region')
  .option('--go', 'Send SQS messages, for real.');


program.parse(process.argv);

function usage () {
  console.log(`Usage:
  reconcile -f <fxa_filename> -s <salesforce_filename> -u <SQS_url> -r <AWS_region>
  reconcile -d <diff_filename> -u <SQS_url> -r <AWS_region>
`);
}

if (! ((program.diff || (program.fxa && program.salesforce)) && program.url && program.region)) {
  usage();
  process.exit(1);
}


let reader;
if (program.fxa) {
  const fxaInputPath = path.resolve(process.cwd(), program.fxa);
  const salesforceInputPath = path.resolve(process.cwd(), program.salesforce);
  reader = new CSVReader(fxaInputPath, salesforceInputPath, ',');
} else {
  const diffInputPath = path.resolve(process.cwd(), program.diff);
  reader = new DiffReader(diffInputPath, ',');
}

let writer;
if (program.json) {
  let output;
  if (program.null) {
    output = new NullOutput();
  } else {
    output = new StdoutOutput();
  }

  writer = new JSONWriter(output);
} else {
  let output;
  if (!! program.go) {
    output = new SQSOutput(program.region);
  } else {
    output = new StdoutOutput();
  }
  writer = new SQSWriter(program.url, output);
}

const reconciler = new ReconciliationManager(reader, writer);
reconciler.run();