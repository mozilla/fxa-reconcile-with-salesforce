# fxa-reconcile-with-salesforce

A utility to reconcile the user databases between FxA and Mozilla's
Salesforce instance.

## Usage

Two database dumps in CSV format are needed. Both dumps need to be stripped of
leading and trailing whitespace, contain no blank lines, and sorted by uid.

The FxA dump must contain uid, email, and locale

> 124516347fsdf2361425,stomlinson@mozilla.com,en_US

The Salesforce dump must contain uid,email

> 124516347fsdf2361425,stomlinson@mozilla.com,en_US

To write to stdout a summary of the commands that would be sent to SQS:

> node bin/reconcile.js -f `<fxa_sorted.csv>` -s `<salesforce_sorted.csv>` -u https://sqs.com -r us-west-2 -j

To write to stdout the full commands that would be sent to SQS:

> node bin/reconcile.js -f `<fxa_sorted.csv>` -s `<salesforce_sorted.csv>` -u https://sqs.com -r us-west-2

To send to SQS:

> node bin/reconcile.js -f `<fxa_sorted.csv>` -s `<salesforce_sorted.csv>` -u `<target_sqs_url>` -r `<target_sqs_region>` --go

To send to SQS, AWS credentials are expected to be available.
See https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html


## Architecture

* `lib/readers` contains logic to read .csv and .diff files and emit `create`, `update` and `delete` events based their contents.
* `lib/writers` contains logic to create an SQS or JSON summary message and send it to an output stream.
* `lib/output` contains logic to send messages to SQS or stdout.

A Reader reads the input file and emits when an update is needed to the Salesforce DB. These events are listened for by a ReconciliationManager that forwards the events to a Writer. The Writer creates a formatted message for the event and writes it to an Output.

This architecture allows us to read multiple types of files as well as perform manual verification of the parsing and message format.

## LICENSE

MPL-2.0