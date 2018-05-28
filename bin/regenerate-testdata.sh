#!/bin/sh -e

FXA=./test_data/fxa.csv
FXA_SORTED=./test_data/fxa_sorted.csv
SALESFORCE=./test_data/salesforce.csv
SALESFORCE_SORTED=./test_data/salesforce_sorted.csv
EXPECTED_COUNTS=./test_data/expected.json

COUNT=4000
PC=27
PU=2
PD=1

node ./bin/generate-test-data.js -f $FXA -s $SALESFORCE -e $EXPECTED_COUNTS -c $COUNT --pc $PC --pu $PU --pd $PD

sort $FXA > $FXA_SORTED
sort $SALESFORCE > $SALESFORCE_SORTED
