/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//const EventEmitter = require('events');
const { Transform } = require('stream');
const { updateBucketStats, calculateBucketDistribution } = require('../../lib/statistics');

class FxaAndSalesforceReconcilingStream extends Transform {
  constructor (options) {
    options.readableObjectMode = true;
    options.writableObjectMode = true;

    super(options);

    this.timestamp = options.timestamp;

    this.counts = {
      delete: 0,
      ignore: 0,
      primaryEmailChanged: 0,
      verified: 0
    };
  }

  _transform(chunk, encoding, callback) {
    this[chunk.type](chunk);

    callback(null);
  }

  _flush () {
    const counts = this.counts;

    counts.stats = calculateBucketDistribution();
    counts.actionable = counts.verified + counts.primaryEmailChanged + counts.delete;
    counts.total = counts.actionable + counts.ignore;
  }

  left ({ left }) {
    const salesforce = this._parseSalesforceSplitLine(left.splitLine);
    // Entry is in the salesforce DB but not the FxA DB, remove it from salesforce.
    updateBucketStats(salesforce.uid);
    this.counts.delete++;
    this.push({ ...salesforce, event: 'delete' });
  }

  right ({ right }) {
    // Entry in FxA DB but not the salesforce DB, add it to salesforce.
    const fxa = this._parseFxaSplitLine(right.splitLine);
    updateBucketStats(fxa.uid);
    this.counts.verified++;
    this.push({ ...fxa, event: 'verified' });
  }

  both ({ left, right }) {
    const fxa = this._parseFxaSplitLine(right.splitLine);
    const salesforce = this._parseSalesforceSplitLine(left.splitLine);

    if (fxa.email.toLowerCase() !== salesforce.email.toLowerCase()) {
      // email has changed, need to update salesforce
      updateBucketStats(fxa.uid);
      this.counts.primaryEmailChanged++;
      this.push({ ...fxa, event: 'primaryEmailChanged' });
    } else {
      this.counts.ignore++;
    }
  }

  _parseFxaSplitLine (fxaSplitLine) {
    const [ uid, email, locale, createDate ] = fxaSplitLine;

    return {
      createDate: createDate && this._normalizeCSVDate(createDate),
      email: email && this._normalizeFxaCSVEmail(email),
      locale: locale && this._normalizeFxaCSVLocale(locale),
      timestamp: this.timestamp,
      uid,
    };
  }

  _parseSalesforceSplitLine (salesforceSplitLine) {
    const [ uid, email ] = salesforceSplitLine;
    return {
      email,
      timestamp: this.timestamp,
      uid,
    };
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

module.exports = FxaAndSalesforceReconcilingStream;
