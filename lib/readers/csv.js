/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EventEmitter = require('events');
const fs = require('fs');
const readline = require('n-readlines');

class CSVReader extends EventEmitter {
  constructor (fxaInputPath, salesforceInputPath, separator=',') {
    super();

    this.fxaInputPath = fxaInputPath;
    this.salesforceInputPath = salesforceInputPath;
    this.separator = separator;
    this.buckets = { '0': 0, '1': 0, '2': 0, '3': 0,
                     '4': 0, '5': 0, '6': 0, '7': 0,
                     '8': 0, '9': 0, 'a': 0, 'b': 0,
                     'c': 0, 'd': 0, 'e': 0, 'f': 0 };
  }

  run () {
    const timestamp = this._getTimestamp();
    const fxaLineReader = new readline(this.fxaInputPath);
    const salesforceLineReader = new readline(this.salesforceInputPath);

    let fxaLine = this._nextValidUid(fxaLineReader);
    let salesforceLine = this._nextValidUid(salesforceLineReader);

    const counts = {
      create: 0,
      update: 0,
      delete: 0,
      ignore: 0,
    };

    while (fxaLine || salesforceLine) {
      // uids are zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz if there is no line.
      // This allows the process to continue when one list is longer
      // than the other.
      const [ fxaUid, fxaEmail, fxaLocale, fxaCreateDate ] = this._splitLineBuffer(fxaLine);
      const [ salesforceUid, salesforceEmail ] = this._splitLineBuffer(salesforceLine);

      const normalizedFxaUid = fxaUid.toLowerCase();
      const normalizedSalesforceUid = salesforceUid.toLowerCase();

      if (normalizedFxaUid < normalizedSalesforceUid) {
        // entry in FxA DB but not the salesforce DB, add it to salesforce.
        this._updateBucketStats(fxaUid);
        this.emit('create', {
          createDate: this._normalizeCreateDate(fxaCreateDate),
          email: fxaEmail,
          locale: fxaLocale,
          uid: fxaUid,
          timestamp
        });
        counts.create++;
        // catch up until equal or past the salesforceUid
        fxaLine = this._nextValidUid(fxaLineReader);
      } else if (normalizedFxaUid === normalizedSalesforceUid) {
        const normalizedFxaEmail = fxaEmail.toLowerCase();
        const normalizedSalesforceEmail = salesforceEmail.toLowerCase();
        if (normalizedFxaEmail !== normalizedSalesforceEmail) {
          // email has changed, need to update salesforce
          this._updateBucketStats(fxaUid);
          this.emit('update', {
            email: fxaEmail,
            uid: fxaUid,
            timestamp
          });
          counts.update++;
        } else {
          counts.ignore++;
        }

        fxaLine = this._nextValidUid(fxaLineReader);
        salesforceLine = this._nextValidUid(salesforceLineReader);
      } else {
        // Entry is in the salesforce DB but not the FxA DB, remove it from salesforce.
        this._updateBucketStats(salesforceUid);
        this.emit('delete', {
          email: salesforceEmail,
          uid: salesforceUid,
          timestamp
        });
        counts.delete++;
        salesforceLine = this._nextValidUid(salesforceLineReader);
      }
    }

    counts.stats = this._calculateBucketDistribution(); 
    this.emit('complete', counts);
  }

  _updateBucketStats (uid) {
    const bucketKey = uid[0];
    const keys = Object.keys(this.buckets);
    if (! keys.includes(bucketKey)) {
      // TheDudeMindsMan
      console.warn('unexpected bucketKey', bucketKey, uid, '; adding to bucket keys');
      this.buckets[bucketKey] = 1
      return;
    }
    
    this.buckets[bucketKey] += 1;
  }

  _calculateBucketDistribution () {
    const bucketKeys = Object.keys(this.buckets);
    const sum = bucketKeys.reduce((sum, key) => sum + this.buckets[key], 0);
    const mean = sum / bucketKeys.length;
    const reducer = (sum, val) => sum + (this.buckets[val] - mean) ** 2
    const sumOfSquares = bucketKeys.reduce(reducer, 0);
    const variance = sumOfSquares / bucketKeys.length;
    const stddev = Math.sqrt(variance);

    return {
      sum: sum.toFixed(2),
      mean: mean.toFixed(2),
      stddev: stddev.toFixed(2)
    };
  }

  _nextValidUid (reader) {
    do {
      let next = reader.next();
      if (! next || next.toString('utf8').match(/([a-fA-F0-9]{32})/)) {
        return next;
      }
    } while (true);
  }

  _splitLineBuffer(lineBuffer) {
    if (lineBuffer) {
      return lineBuffer.toString('utf8').split(this.separator).map(item => item.trim());
    }
    // zzzzzzzzzzzzzzzzzzzzzzzzzzz is returned as the UID if a line does not exist.
    // Since uids are hex, this should always be considered > a real UID.
    return ['zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'];
  }

  _getTimestamp () {
    const stats = fs.statSync(this.fxaInputPath);
    // from https://github.com/mozilla/fxa-auth-server/blob/690ba822cbb00866b49454bf4a2e07edef0e7d89/lib/log.js#L128,
    // convert timestamp to a float, in seconds.
    return stats.ctimeMs / 1000;
  }

  _normalizeCreateDate (createDate) {
    return createDate;
  }
}

module.exports = CSVReader;
