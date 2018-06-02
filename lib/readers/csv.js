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

const { Readable } = require('stream');
const fs = require('fs');
const readline = require('n-readlines');
const { updateBucketStats, calculateBucketDistribution } = require('../../lib/statistics');

const UID_HEX32_RE = /^[a-f0-9]{32}$/;
const SOURCE_FXA = 'fxa';
const SOURCE_SF = 'sf';

class CSVReader extends Readable {
  constructor (options = {}) {
    options.objectMode = true;
    super(options);

    this.separator = options.separator;
    this.previousUidBySource = {};
    this.timestamp = this._getTimestamp(options.fxaInputPath);
    this.fxaLineReader = new readline(options.fxaInputPath); // eslint-disable-line new-cap
    this.salesforceLineReader = new readline(options.salesforceInputPath); // eslint-disable-line new-cap

    this.counts = {
      create: 0,
      delete: 0,
      error: 0,
      ignore: 0,
      update: 0,
    };

    this.fxaLine = this._nextValidUid(this.fxaLineReader, SOURCE_FXA);
    this.salesforceLine = this._nextValidUid(this.salesforceLineReader, SOURCE_SF);
  }

  _read () {
    if (this.fxaLine || this.salesforceLine) {
      let toPush;
      // uids are zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz if there is no line.
      // This allows the process to continue when one list is longer
      // than the other.
      const fxa = this._parseFxaLine(this.fxaLine, this.timestamp);
      const salesforce = this._parseSalesforceLine(this.salesforceLine, this.timestamp);
      const comparison = fxa.uid.localeCompare(salesforce.uid);

      if (comparison < 0) {
        // entry in FxA DB but not the salesforce DB, add it to salesforce.
        updateBucketStats(fxa.uid);
        this.counts.create++;
        // catch up until equal or past the salesforceUid
        this.fxaLine = this._nextValidUid(this.fxaLineReader, SOURCE_FXA);
        toPush = { ...fxa, event: 'verified' };
      } else if (! comparison) {
        if (fxa.email.toLowerCase() !== salesforce.email.toLowerCase()) {
          // email has changed, need to update salesforce
          updateBucketStats(fxa.uid);
          this.counts.update++;
          toPush = { ...fxa, event: 'primaryEmailChanged' };
        } else {
          this.counts.ignore++;
        }

        this.fxaLine = this._nextValidUid(this.fxaLineReader, SOURCE_FXA);
        this.salesforceLine = this._nextValidUid(this.salesforceLineReader, SOURCE_SF);
      } else {
        // Entry is in the salesforce DB but not the FxA DB, remove it from salesforce.
        updateBucketStats(salesforce.uid);
        this.counts.delete++;
        this.salesforceLine = this._nextValidUid(this.salesforceLineReader, SOURCE_SF);
        toPush = { ...salesforce, event: 'delete' };
      }

      if (toPush) {
        // pushed data must be a string or a buffer.
        this.push(toPush);
      } else {
        // If there was no data to push this time, read another line
        // until there is or else the stream processing will stop.
        this._read();
      }
    } else {
      this.counts.stats = calculateBucketDistribution();
      this.emit('complete', this.counts);
      this.push(null);
    }
  }

  _nextValidUid (reader, source) {
    do {
      const next = reader.next();
      if (! next) {
        return next;
      }

      const [ uid ] = this._splitLineBuffer(next);
      if (! uid.match(UID_HEX32_RE)) {
        // It's not a valid uid. Emit error and go back around for the next one.
        const error = new Error('Invalid uid. Discarding.');
        error.data = { source: source, uid: uid };
        this.emit('error', error);
        this.counts.error++;
        continue;
      }

      const previousUid = this.previousUidBySource[source];
      if (previousUid && previousUid >= uid) {
        // We have seen our first valid uid on this source, but the current
        // uid is out of order (or it's a sequential duplicate). Emit a fatal
        // event because there is no way to recover from an incorrectly sorted
        // list. The calling top-level program must exit on fatal!
        const error = new Error('Incorrectly sorted list.');
        error.data = { source: source, uid: uid };
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
      createDate: createDate && this._normalizeCSVDate(createDate),
      email: email && this._normalizeFxaCSVEmail(email),
      locale: locale && this._normalizeFxaCSVLocale(locale),
      timestamp,
      uid,
    };
  }

  _parseSalesforceLine (salesforceLine, timestamp) {
    const [ uid, email ] = this._splitLineBuffer(salesforceLine);
    return {
      email,
      timestamp,
      uid,
    };
  }

  _splitLineBuffer(lineBuffer) {
    if (lineBuffer) {
      return lineBuffer.toString('utf8').split(this.separator).map(item => item.trim());
    }
    // zzzzzzzzzzzzzzzzzzzzzzzzzzz is returned as the UID if a line does not exist.
    // Since uids are hex, this should always be considered > a real UID.
    return ['zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'];
  }

  _getTimestamp (inputPath) {
    const stats = fs.statSync(inputPath);
    return new Date(stats.ctimeMs);
  }

  _normalizeCSVDate (msSinceUnixEpoch) {
    // Dates in the CSV file are represented as milliseconds since the unix epoch,
    // converted to a string.
    const time = parseInt(msSinceUnixEpoch, 10);
    return new Date(time);
  }

  _normalizeFxaCSVLocale (locale) {
    return this._base64ToUtf8(locale).trim();
  }

  _normalizeFxaCSVEmail (email) {
    return this._base64ToUtf8(email).trim();
  }

  _base64ToUtf8 (str) {
    return Buffer.from(str, 'base64').toString('utf8');
  }
}

module.exports = CSVReader;
