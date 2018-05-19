# fxa-reconcile-with-salesforce

A utility to reconcile the user databases between FxA and Mozilla's
Salesforce instance.

## Usage

Two database dumps in CSV format are needed. Both dumps need to be stripped of
leading and trailing whitespace, contain no blank lines, and sorted by uid.

The FxA dump must contain uid, email, locale, and create_date

> 124516347fsdf2361425,stomlinson@mozilla.com,en_US,2018-05-18T11:52:10.154Z

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

## Preparing the Salesforce data

The Salesforce data comes in a UTF-16 CSV with the following format:

> CREATED_DATE_,EMAIL_ADDRESS_,FXA_ID,FXA_LANGUAGE_ISO2

This needs to be converted to a UTF-8 file with the following format:

> FXA_ID,EMAIL

Standard unix commands can take care of the prep work:

1. `iconv -f utf-16 -t utf-8 <salesforce.original.utf16.csv> > <salesforce.original.utf8.csv>` - converts UTF-16 to UTF-8, creating an output file of half the size.
2. `tail -n +2 <salesforce.original.utf8.csv> | cut -d , -f 3,2 | perl -pe 's/^(\S+),(\S+)/$2,$1/;' > <salesforce.correct_columns.unsorted.csv>` - Ditch the schema line, extract and output one `UID,email` per line
3. `sort <salesforce.correct_columns.unsorted.csv> > <salesforce.sorted.csv>` - Sort the CSV by UID.

## Allowing for more nodejs memory, if needed 

> node bin/csv-to-json.js --max-old-space-size=8192 -f `<fxa_sorted.csv>` -s `<salesforce_sorted.csv>`

## Architecture

* `lib/readers` contains logic to read .csv and .diff files and emit `create`, `update` and `delete` events based their contents.
* `lib/writers` contains logic to create an SQS or JSON summary message and send it to an output stream.
* `lib/output` contains logic to send messages to SQS or stdout.

A Reader reads the input file and emits when an update is needed to the Salesforce DB. These events are listened for by a ReconciliationManager that forwards the events to a Writer. The Writer creates a formatted message for the event and writes it to an Output.

This architecture allows us to read multiple types of files as well as perform manual verification of the parsing and message format.

## LICENSE

MPL-2.0