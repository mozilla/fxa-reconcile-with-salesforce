/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const path = require('path');
const program = require('commander');

const CSVReader = require('../lib/readers/csv');
const JSONReader = require('../lib/readers/json');
const JSONWriter = require('../lib/writers/json');
const ReconciliationManager = require('../lib/index');
const SQSOutput = require('../lib/output/sqs');
const SQSWriter = require('../lib/writers/sqs');
const StdoutOutput = require('../lib/output/stdout');
const NullOutput = require('../lib/output/null');

program
  .option('-f, --fxa [filename]', 'FxA CSV, format expected to be `uid,email,locale`')
  .option('-s, --salesforce [filename]', 'Salesforce CSV, format expected to be `uid,email`')
  .option('--jsonin [filename]', 'Instead of specifying an FxA CSV and a Salesforce CSV, can specify one JSON file that contains all of the commands to run')
  .option('-n, --null', 'No output')
  .option('--jsonout', 'Write JSON output to stdout')
  .option('-u, --url <SQS_url>', 'SQS URL')
  .option('-r, --region <AWS_region>', 'AWS Region')
  .option('--ts <timestamp>', 'Timestamp to use when sending SQS messages')
  .option('--go', 'Send SQS messages, for real.');


program.parse(process.argv);

function usage () {
  console.log(`Usage:
  reconcile -f <fxa_filename> -s <salesforce_filename> -u <SQS_url> -r <AWS_region>
  reconcile --jsonin <json_filename> -u <SQS_url> -r <AWS_region>
`);
}

if (! ((program.jsonin || (program.fxa && program.salesforce)) && program.url && program.region)) {
  usage();
  process.exit(1);
}


let reader;
if (program.fxa) {
  const fxaInputPath = path.resolve(process.cwd(), program.fxa);
  const salesforceInputPath = path.resolve(process.cwd(), program.salesforce);
  reader = new CSVReader(fxaInputPath, salesforceInputPath, ',');
} else if (program.jsonin) {
  const jsonInputPath = path.resolve(process.cwd(), program.jsonin);
  reader = new JSONReader(jsonInputPath, ',');
}

let writer;
if (program.jsonout) {
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
  writer = new SQSWriter(program.url, output, program.ts);
}

const reconciler = new ReconciliationManager(reader, writer);
reconciler.run();