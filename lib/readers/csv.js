/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * FxA CSV is expected to be in the format:
 * uid,email,locale,create_date
 *
 * Salesforce CSV is expected to be in the format:
 * uid,email
 */

const assert = require('assert');
const EventEmitter = require('events');
const fs = require('fs');
const readline = require('n-readlines');
const csvParse = require('csv-parse/lib/sync');

const UID_HEX32_RE = /^[a-f0-9]{32}$/;
const SOURCE_FXA = 'fxa';
const SOURCE_SF = 'sf';

class CSVReader extends EventEmitter {
  constructor (fxaInputPath, salesforceInputPath, separator=',') {
    super();

    this.fxaInputPath = fxaInputPath;
    this.salesforceInputPath = salesforceInputPath;
    this.separator = separator;
    this.cvsParseOptions = {
      trim: true,
      delimiter: this.separator
    }

    this.previousUidBySource = {};
    this.buckets = { '0': 0, '1': 0, '2': 0, '3': 0,
                     '4': 0, '5': 0, '6': 0, '7': 0,
                     '8': 0, '9': 0, 'a': 0, 'b': 0,
                     'c': 0, 'd': 0, 'e': 0, 'f': 0 };
  }

  run () {
    const timestamp = this._getTimestamp();
    const fxaLineReader = new readline(this.fxaInputPath);
    const salesforceLineReader = new readline(this.salesforceInputPath);

    let fxaLine = this._nextValidUid(fxaLineReader, SOURCE_FXA);
    let salesforceLine = this._nextValidUid(salesforceLineReader, SOURCE_SF);

    const counts = {
      create: 0,
      update: 0,
      delete: 0,
      ignore: 0,
    };

    while (fxaLine || salesforceLine) {
      const fxa = this._parseFxaLine(fxaLine, timestamp);
      const salesforce = this._parseSalesforceLine(salesforceLine, timestamp);

      if (fxa.normalizedUid < salesforce.normalizedUid) {
        // entry in FxA DB but not the salesforce DB, add it to salesforce.
        this._updateBucketStats(fxa.uid);
        this.emit('create', fxa);
        counts.create++;
        // catch up until equal or past the salesforce.uid
        fxaLine = this._nextValidUid(fxaLineReader, SOURCE_FXA);
      } else if (fxa.normalizedUid === salesforce.normalizedUid) {
        if (fxa.normalizedEmail !== salesforce.normalizedEmail) {
          // email has changed, need to update salesforce
          this._updateBucketStats(fxa.uid);
          this.emit('update', fxa);
          counts.update++;
        } else {
          counts.ignore++;
        }

        fxaLine = this._nextValidUid(fxaLineReader, SOURCE_FXA);
        salesforceLine = this._nextValidUid(salesforceLineReader, SOURCE_SF);
      } else {
        // Entry is in the salesforce DB but not the FxA DB, remove it from salesforce.
        this._updateBucketStats(salesforce.uid);
        this.emit('delete', salesforce);
        counts.delete++;
        salesforceLine = this._nextValidUid(salesforceLineReader, SOURCE_SF);
      }
    }

    counts.stats = this._calculateBucketDistribution();
    this.emit('complete', counts);
  }

  _updateBucketStats (uid) {
    const bucketKey = uid[0];
    const keys = Object.keys(this.buckets);
    assert.ok(keys.includes(bucketKey), 'All bucket keys are a-f0-9')
    this.buckets[bucketKey] += 1;
  }

  _calculateBucketDistribution () {
    const bucketKeys = Object.keys(this.buckets);
    const sum = bucketKeys.reduce((sum, key) => sum + this.buckets[key], 0);
    const mean = sum / bucketKeys.length;
    const reducer = (sum, val) => sum + (this.buckets[val] - mean) ** 2;
    const sumOfSquares = bucketKeys.reduce(reducer, 0);
    const variance = sumOfSquares / bucketKeys.length;
    const stddev = Math.sqrt(variance);

    return {
      sum: sum.toFixed(2),
      mean: mean.toFixed(2),
      stddev: stddev.toFixed(2)
    };
  }

  _nextValidUid (reader, source) {
    do {
      let next = reader.next();
      if (! next) {
        return next;
      }

      let [ uid ] = this._splitLineBuffer(next);
      if (! uid.match(UID_HEX32_RE)) {
        // It's not a valid uid. Emit error and go back around for the next one.
        let error = new Error('Invalid uid. Discarding.');
        error.data = { uid: uid, source: source };
        this.emit('error', error);
        continue;
      }

      let previousUid = this.previousUidBySource[source];
      if (previousUid && previousUid >= uid) {
        // We have seen our first valid uid on this source, but the current
        // uid is out of order (or it's a sequential duplicate). Emit a fatal
        // event because there is no way to recover from an incorrectly sorted
        // list. The calling top-level program must exit on fatal!
        let error = new Error('Incorrectly sorted list.');
        error.data = { uid: uid, source: source };
        this.emit('fatal', error);
        break;
      }

      // update our previously seen uid
      this.previousUidBySource[source] = uid;

      return next;
    } while (true);
  }

  _parseFxaLine (fxaLine, timestamp) {
    const [ uid, email, locale, createDate ] = this._splitLineBuffer(fxaLine);
    return {
      createDate: this._normalizeCSVDate(createDate),
      email: email,
      locale: this._normalizeCSVLocale(locale),
      normalizedEmail: this._normalizeCSVEmail(email),
      normalizedUid: this._normalizeCSVUid(uid),
      timestamp,
      uid,
    };
  }

  _parseSalesforceLine (salesforceLine, timestamp) {
    const [ uid, email ] = this._splitLineBuffer(salesforceLine);
    return {
      email,
      normalizedEmail: this._normalizeCSVEmail(email),
      normalizedUid: this._normalizeCSVUid(uid),
      timestamp,
      uid,
    };
  }

  _splitLineBuffer(lineBuffer) {
    if (lineBuffer) {
      const parsed = csvParse(lineBuffer.toString('utf8'), this.cvsParseOptions);
      assert.ok(parsed.length === 1, 'Line parsed as one row.');
      return parsed[0]
    }
    // zzzzzzzzzzzzzzzzzzzzzzzzzzz is returned as the UID if a line does not exist.
    // Since uids are hex, this should always be considered > a real UID.
    return ['zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'];
  }

  _getTimestamp () {
    const stats = fs.statSync(this.fxaInputPath);
    return new Date(stats.ctimeMs);
  }

  _normalizeCSVDate (msSinceUnixEpoch) {
    // Dates in the CSV file are represented as milliseconds since the unix epoch,
    // converted to a string.
    const time = parseInt(msSinceUnixEpoch.trim(), 10);
    return new Date(time);
  }

  _normalizeCSVLocale (locale) {
    return locale && locale.trim();
  }

  _normalizeCSVEmail (email) {
    return email && email.toLowerCase();
  }

  _normalizeCSVUid (uid) {
    return uid && uid.toLowerCase();
  }
}

module.exports = CSVReader;
