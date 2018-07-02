/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const path = require('path');
const program = require('commander');

const CSVReader = require('../lib/readers/csv');
const FxaDeleteReconcilingStream = require('../lib/reconcilers/salesforce-remove-deleted');
const StreamManager = require('../lib/reconcilers/stream-manager');
const NewlineTransform = require('../lib/transforms/newline');
const NullWriter = require('../lib/writers/null');

program
  .option('-d, --deleted <filename>', 'Deleted accounts CSV, format expected to be `uid,email`')
  .option('-h, --highwater [N]', 'High water mark, defaults to 16384. See https://nodejs.org/api/stream.html#stream_constructor_new_stream_writable_options')
  .option('-s, --salesforce <filename>', 'Salesforce CSV, format expected to be `uid,email`')
  .option('--dryrun', 'Dry run, no output emitted');

program.parse(process.argv);

const programName = path.basename(process.argv[1]);

function usage () {
  console.log(`Usage:
  node ${programName} -d <deleted_csv_filename> -s <salesforce_csv_filename>
`);
}

if (! program.deleted || ! program.salesforce) {
  usage();
  process.exit(1);
}

const highWaterMark = parseInt(program.highwater || 16384, 10);

const deletedInputPath = path.resolve(process.cwd(), program.deleted);
const salesforceInputPath = path.resolve(process.cwd(), program.salesforce);
const readerStream = new CSVReader({
  highWaterMark,
  leftInputPath: deletedInputPath,
  leftSource: 'del',
  rightInputPath: salesforceInputPath,
  rightSource: 'sf',
  separator: ','
});

const reconcilerStream = new FxaDeleteReconcilingStream({
  highWaterMark,
});
const newlineTransform = new NewlineTransform({
  highWaterMark,
});
const outputStream = program.dryrun ? new NullWriter() : process.stdout;

readerStream.pipe(reconcilerStream).pipe(newlineTransform).pipe(outputStream);

const manager = new StreamManager(readerStream, outputStream, reconcilerStream, process.stderr); // eslint-disable-line no-unused-vars

