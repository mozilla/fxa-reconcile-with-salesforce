# fxa-reconcile-with-salesforce

A utility to reconcile the user databases between FxA and Mozilla's
Salesforce instance.

## Usage

Two database dumps in CSV format are needed. Both dumps need to be stripped of
leading and trailing whitespace, contain no blank lines, and sorted by uid.

The FxA dump must contain uid, base64(email), base64(locale), and create_date

> 124516347fsdf2361425,base64('stomlinson@mozilla.com'),base64('en_US'),1526933232113

`create_date` is milliseconds since the Unix epoch.

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

## Allowing for more nodejs memory, if needed. Recommended.

> node bin/csv-to-json.js --max-old-space-size=8192 -f `<fxa_sorted.csv>` -s `<salesforce_sorted.csv>`

## Generating test data
Test data can be generated:

> node ./bin/generate-test-data.js -f ./test_data/fxa.csv -s ./test_data/salesforce.csv -c 4000 --pc 27 --pu 2 --pd 1 --pi 1

This would generate a total of 4000 rows, 27% creates, 2% updates, 1% deletions, 1% invalid uid saved to test_data/fxa.csv and test_data/salesforce.csv

* `-c, --count <count>`          Total record count
* `-f, --fxa [filename]`         FxA CSV
* `-s, --salesforce [filename]`  Salesforce CSV
* `--pc [percentage]`            % of accounts that need to be created on Salesforce, defaults to 10%
* `--pu [percentage]`            % of accounts that need to be updated on Salesforce, defaults to 5%
* `--pd [percentage]`            % of accounts that need to be deleted on Salesforce, defaults to 10%
* `--pi [percentage]`            % of accounts that have an invalid uid from either source, defaults to 1%

Output files are *unsorted*. The generated uid for each line is random and sorting in
the generation script is prohibitively expensive for large datasets. The best tool
to sort the output is the Unix `sort` command:

> sort fxa.csv > fxa_sorted.csv

> sort salesforce.csv > salesforce_sorted.csv

You can run `./bin/regenerate-testdata.sh` to do the above. Use those `Counts` to update `expected` in `./tests/lib/readers/csv.test.js`.

## Architecture

Everything is based on [NodeJS Streams](https://nodejs.org/api/stream.html)

* `lib/readers` contains logic to read .csv and .diff files. A JSON blob with the event will be pushed onto the stream queue for each entry in the input file.
* `lib/transforms` contains logic to transform the JSON blob from the reader into a message suitable for output. The transformed message is pushed onto the stream queue for further transformation or output.
* `lib/writers` contains logic to send messages to SQS.

This architecture allows us to read multiple types of files as well as perform manual verification of the parsing and message format.

## LICENSE

MPL-2.0
