/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const path = require('path');
const program = require('commander');

const ReconciliationManager = require('../lib/index');

const JSONReader = require('../lib/readers/json');

const JSONTransform = require('../lib/transforms/json');
const SQSTransform = require('../lib/transforms/sqs');

const SQSWriter = require('../lib/writers/sqs');

program
  .option('-i, --input <filename>', 'JSON input')
  .option('-u, --url [SQS_url]', 'SQS URL')
  .option('-r, --region [AWS_region]', 'AWS Region')
  .option('--dryrun', 'Exercise the SQS writer, write to stdout instead of to SQS');


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
const reader = new JSONReader({
  inputPath: jsonInputPath,
});

const sqsTransform = new SQSTransform({ queueUrl: program.url });

let output;
if ((program.url && program.region) || program.dryrun) {
  let sqsWriter;
  if (program.dryrun) {
    sqsWriter = new SQSWriter({
      sqs: {
        sendMessage(message, callback) {
          setTimeout(() => callback(), Math.random() * 5);
        }
      }
    });
  } else {
    sqsWriter = new SQSWriter({ region: program.region });
  }

  output = sqsWriter;
  reader.pipe(sqsTransform).pipe(sqsWriter);

  let sentCount = 0;

  let finishedReading = false;
  reader.on('end', () => {
    finishedReading = true;
  });

  process.stderr.write('\n');
  sqsWriter.on('sent', (data) => {
    sentCount++;
    if (! (sentCount % 10) || finishedReading) {
      // go back to the beginning of the previous line and print the new count.
      process.stderr.write('\033[Fsent: ' + sentCount + '\n');
    }
  });
} else {
  output = process.stdout;
  reader.pipe(sqsTransform).pipe(new JSONTransform({ suffix: '\n' })).pipe(process.stdout);
}

new ReconciliationManager(reader, output);
