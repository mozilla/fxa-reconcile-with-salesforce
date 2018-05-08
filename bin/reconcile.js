const program = require('commander');

program
  .option('-f, --fxa', 'FxA user dB in CSV format')
  .option('-s, --salesforce', 'Salesforce user dB in CSV format')
  .option('-i, --keyid', 'Amazon access key id')
  .option('-k, --key', 'Amazon secret access key')
  .option('--go', 'Do it, for real.');


program.parse(process.argv);

