/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const path = require('path');
const program = require('commander');

const JSONReader = require('../lib/readers/json');
const ReconciliationManager = require('../lib/index');
const SQSOutput = require('../lib/output/sqs');
const SQSWriter = require('../lib/writers/sqs');
const StdoutOutput = require('../lib/output/stdout');
const NullOutput = require('../lib/output/null');

program
  .option('-i, --input <filename>', 'JSON input')
  .option('-u, --url [SQS_url]', 'SQS URL')
  .option('-r, --region [AWS_region]', 'AWS Region');


program.parse(process.argv);

function usage () {
  console.log(`Usage:
  json-to-sqs -i <json_filename>                                  - Write SQS output to standard out as a test
  json-to-sqs -i <json_filename> -u <SQS_url> -r <AWS_region>     - Do this thing, for real.
`);
}

if (! program.input) {
  usage();
  process.exit(1);
}


const jsonInputPath = path.resolve(process.cwd(), program.input);
const reader = new JSONReader(jsonInputPath, ',');

let output;
if (program.url && program.region) {
  output = new SQSOutput(program.region);
} else {
  output = new StdoutOutput();
}
writer = new SQSWriter(program.url, output, program.ts);

const reconciler = new ReconciliationManager(reader, writer);
reconciler.run();