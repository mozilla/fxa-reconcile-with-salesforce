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
    const fxaLineReader = new readline(this.fxaInputPath);
    const salesforceLineReader = new readline(this.salesforceInputPath);

    let fxaLine = fxaLineReader.next();
    let salesforceLine = salesforceLineReader.next();

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
          uid: fxaUid
        });
        // catch up until equal or past the salesforceUid
        fxaLine = fxaLineReader.next();
      } else if (fxaUid === salesforceUid) {
        if (fxaEmail !== salesforceEmail) {
          // email has changed, need to update salesforce
          this.emit('update', {
            email: fxaEmail,
            uid: fxaUid
          });
        }

        fxaLine = fxaLineReader.next();
        salesforceLine = salesforceLineReader.next();
      } else {
        // Entry is in the salesforce DB but not the FxA DB, remove it from salesforce.
        this.emit('delete', {
          email: salesforceEmail,
          uid: salesforceUid
        });
        salesforceLine = salesforceLineReader.next();
      }
    }

    this.emit('complete');
  }

  _splitLineBuffer(lineBuffer) {
    if (lineBuffer) {
      return lineBuffer.toString('utf8').split(',');
    }
    // zzzzzzzzzzzzzzzzzzzzzzzzzzz is returned as the UID if a line does not exist.
    // Since uids are hex, this should always be considered > a real UID.
    return ['zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'];
  }
}

module.exports = CSVReader;
