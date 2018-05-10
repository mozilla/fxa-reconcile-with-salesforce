const path = require('path');
const program = require('commander');
const Reconciler = require('../lib/index');
const CSVReader = require('../lib/readers/csv-reader');
const SQSWriter = require('../lib/writers/sqs');
const JSONWriter = require('../lib/writers/json');

program
  .option('-f, --fxa <filename>', 'FxA CSV, format expected to be `uid,email,locale`')
  .option('-s, --salesforce <filename>', 'Salesforce CSV, format expected to be `uid,email`')
  .option('-j, --json', 'Write JSON output')
  .option('-u, --url <SQS_url>', 'SQS URL')
  .option('-r, --region <AWS_region>', 'AWS Region')
  .option('--go', 'Send SQS messages, for real.');


program.parse(process.argv);

function usage () {
  console.log(`Usage:
  reconcile-csv -f <fxa_filename> -s <salesforce_filename> -u <SQS_url> -r <AWS_region>
`);
}

if (! (program.fxa && program.salesforce && program.url && program.region)) {
  usage();
  process.exit(1);
}

const fxaInputPath = path.resolve(process.cwd(), program.fxa);
const salesforceInputPath = path.resolve(process.cwd(), program.salesforce);

const reader = new CSVReader(fxaInputPath, salesforceInputPath, ',');

let writer;
if (program.json) {
  writer = new JSONWriter(process.stdout);
} else {
  writer = new SQSWriter(program.url, program.region, !! program.go);
}

const reconciler = new Reconciler(program.url, program.region, reader, writer);
reconciler.run();