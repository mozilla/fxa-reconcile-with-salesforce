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
  }

  run () {
    const timestamp = this._getTimestamp();
    const fxaLineReader = new readline(this.fxaInputPath);
    const salesforceLineReader = new readline(this.salesforceInputPath);

    let fxaLine = fxaLineReader.next();
    let salesforceLine = salesforceLineReader.next();

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
      const [ fxaUid, fxaEmail, fxaLocale ] = this._splitLineBuffer(fxaLine);
      const [ salesforceUid, salesforceEmail ] = this._splitLineBuffer(salesforceLine);

      if (fxaUid < salesforceUid) {
        // entry in FxA DB but not the salesforce DB, add it to salesforce.
        this.emit('create', {
          email: fxaEmail,
          locale: fxaLocale,
          uid: fxaUid,
          timestamp
        });
        counts.create++;
        // catch up until equal or past the salesforceUid
        fxaLine = fxaLineReader.next();
      } else if (fxaUid === salesforceUid) {
        if (fxaEmail !== salesforceEmail) {
          // email has changed, need to update salesforce
          this.emit('update', {
            email: fxaEmail,
            uid: fxaUid,
            timestamp
          });
          counts.update++;
        } else {
          counts.ignore++;
        }

        fxaLine = fxaLineReader.next();
        salesforceLine = salesforceLineReader.next();
      } else {
        // Entry is in the salesforce DB but not the FxA DB, remove it from salesforce.
        this.emit('delete', {
          email: salesforceEmail,
          uid: salesforceUid,
          timestamp
        });
        counts.delete++;
        salesforceLine = salesforceLineReader.next();
      }
    }

    this.emit('complete', counts);
  }

  _splitLineBuffer(lineBuffer) {
    if (lineBuffer) {
      return lineBuffer.toString('utf8').split(',');
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
}

module.exports = CSVReader;
