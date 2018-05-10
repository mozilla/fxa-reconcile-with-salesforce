const path = require('path');
const program = require('commander');
const Reconciler = require('../lib/index');
const DiffReader = require('../lib/readers/diff-reader');
const SQSWriter = require('../lib/writers/sqs');
const JSONWriter = require('../lib/writers/json');

program
  .option('-i, --input <filename>', 'Differences file, expected to be output of diff')
  .option('-u, --url <SQS_url>', 'SQS URL')
  .option('-r, --region <AWS_region>', 'AWS Region')
  .option('--go', 'Send SQS messages, for real.');


program.parse(process.argv);

function usage () {
  console.log(`Usage:
  reconcile-diff -i <filename> -u <SQS_url> -r <AWS_region>
`);
}

if (! (program.input && program.url && program.region)) {
  usage();
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), program.input);

const diffReader = new DiffReader(inputPath, ',');

const reconciler = new Reconciler(program.url, program.region, diffReader, !! program.go);
reconciler.run();