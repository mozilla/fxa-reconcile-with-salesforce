# fxa-reconcile-with-salesforce

A utility to reconcile the user databases between FxA and Mozilla's
Salesforce instance.

## Usage

Two database dumps in CSV format are needed. Both dumps need to be stripped of
leading and trailing whitespace, contain no blank lines, and sorted by uid.

The FxA dump must contain uid, email, and locale

> 124516347fsdf2361425,stomlinson@mozilla.com,en_US

The Salesforce dump must contain uid,email

> 124516347fsdf2361425,stomlinson@mozilla.com

To help check that the CSVs are parsed as expected, an intermediate JSON
representation of the SQS commands to be sent is generated. This writes
to stdout by default:

> node bin/csv-to-json.js -f `<fxa_sorted.csv>` -s `<salesforce_sorted.csv>`

To save to a file:

> node bin/csv-to-json.js -f `<fxa_sorted.csv>` -s `<salesforce_sorted.csv>` &gt; commands.json

To do a dry run and display the list of SQS commands that would be sent:

> node bin/json-to-sqs.js -i `<commands_json>`

To send to SQS, the target SQS endpoint and region must be specified:

> node bin/json-to-sqs.js -i `<commands_json>` -u `<target_sqs_url>` -r `<target_sqs_region>`

AWS credentials are expected to be available.
See https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html


## Architecture

* `lib/readers` contains logic to read .csv and .diff files and emit `create`, `update` and `delete` events based their contents.
* `lib/writers` contains logic to create an SQS or JSON summary message and send it to an output stream.
* `lib/output` contains logic to send messages to SQS or stdout.

A Reader reads the input file and emits when an update is needed to the Salesforce DB. These events are listened for by a ReconciliationManager that forwards the events to a Writer. The Writer creates a formatted message for the event and writes it to an Output.

This architecture allows us to read multiple types of files as well as perform manual verification of the parsing and message format.

## LICENSE

MPL-2.0