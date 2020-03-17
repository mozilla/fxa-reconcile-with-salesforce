/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const path = require('path');
const program = require('commander');

const StreamManager = require('../lib/reconcilers/stream-manager');

const JSONReader = require('../lib/readers/json');

const JSONTransform = require('../lib/transforms/json');
const SQSTransform = require('../lib/transforms/sqs');

const SQSWriter = require('../lib/writers/sqs');

program
  .option('-h, --highwater [N]', 'High water mark, defaults to 16384. See https://nodejs.org/api/stream.html#stream_constructor_new_stream_writable_options')
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

const highWaterMark = parseInt(program.highwater || 16384, 10);

const jsonInputPath = path.resolve(process.cwd(), program.input);
const inputStream = new JSONReader({
  highWaterMark,
  inputPath: jsonInputPath,
});

const sqsTransformStream = new SQSTransform({ highWaterMark });


let outputStream;
if ((program.url && program.region) || program.dryrun) {
  let sqsMock;
  if (program.dryrun) {
    sqsMock = createSqsMock();
  }

  const sqsWriter = new SQSWriter({
    highWaterMark,
    queueUrl: program.url,
    region: program.region,
    sqs: sqsMock
  });

  outputStream = sqsWriter;
  inputStream.pipe(sqsTransformStream).pipe(sqsWriter);
/*
  let finishedReading = false;
  inputStream.on('end', () => {
    finishedReading = true;
  });

  process.stdout.write('\n');
  sqsWriter.on('sent', (data) => {
    const sentCount = sqsTransformStream.counts.sent;

    if (! (sentCount % 10) || finishedReading) {
      // go back to the beginning of the previous line and print the new count.
      process.stdout.write(`\x1b[Fsent: ${sentCount}\n`);
    }
  });*/
} else {
  outputStream = process.stdout;
  inputStream.pipe(sqsTransformStream).pipe(new JSONTransform({ suffix: '\n' })).pipe(outputStream);
}

function createSqsMock () {
  return {
    sendMessage(message, callback) {
      setTimeout(() => {
        const shouldReturnError = Math.random() * 100 <= 1;
        if (shouldReturnError) {
          callback(new Error('Error sending individual item'), message);
        } else {
          callback();
        }
      }, Math.random() * 200);
    },
    sendMessageBatch(batch, callback) {
      setTimeout(() => {
        const shouldBatchFail = Math.random() * 1000 <= 1;
        if (shouldBatchFail) {
          callback(new Error('Error sending batch'), batch);
        } else {
          const successful = [];
          const failed = [];
          batch.Entries.forEach((entry) => {
            const shouldItemFail = Math.random() * 1000 <= 1;
            if (shouldItemFail) {
              failed.push({
                Id: entry.Id,
                Message: 'Error sending batch item'
              });
            } else {
              successful.push(entry);
            }
          });
          callback(null, { Failed: failed, Successful: successful });
        }
      }, Math.random() * 200);
    }
  };
}

void new StreamManager(inputStream, outputStream, sqsTransformStream, process.stderr); // eslint-disable-line no-unused-vars
