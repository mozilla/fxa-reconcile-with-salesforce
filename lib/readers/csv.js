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

const EventEmitter = require('events');
const { Readable } = require('stream');
const readline = require('n-readlines');

const UID_HEX32_RE = /^[a-f0-9]{32}$/;

// zzzzzzzzzzzzzzzzzzzzzzzzzzz is returned as the UID if a line does not exist.
// Since uids are hex, this should always be considered > a real UID.
const NO_MORE_LINES_UID = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';

class CSVLineReader extends EventEmitter {
  constructor (options = {}) {
    super(options);

    this._lineReader = new readline(options.inputPath); // eslint-disable-line new-cap
    this._source = options.source;
    this._separator = options.separator || ',';
    this._previousUid = undefined;
  }

  next () {
    do {
      const lineBuffer = this._lineReader.next();
      if (! lineBuffer) {
        // zzzzzzzzzzzzzzzzzzzzzzzzzzz is returned as the UID if a line does not exist.
        // Since uids are hex, this should always be considered > a real UID.
        return {
          finished: true,
          uid: NO_MORE_LINES_UID
        };
      }

      const line = lineBuffer.toString('utf8');
      const splitLine = this._splitLine(line);
      const [ uid ] = splitLine;
      if (! uid.match(UID_HEX32_RE)) {
        // It's not a valid uid. Emit error and go back around for the next one.
        const error = new Error('Invalid uid. Discarding.');
        error.data = { source: this._source, uid: uid };
        this.emit('error', error);
        continue;
      }

      const previousUid = this._previousUid;
      if (previousUid && previousUid >= uid) {
        // We have seen our first valid uid on this source, but the current
        // uid is out of order (or it's a sequential duplicate). Emit a fatal
        // event because there is no way to recover from an incorrectly sorted
        // list. The calling top-level program must exit on fatal!
        const error = new Error('Incorrectly sorted list.');
        error.data = { source: this._source, uid: uid };
        this.emit('fatal', error);
        break;
      }

      // update our previously seen uid
      this._previousUid = uid;

      //console.log(this._source, 'read', uid);
      return {
        line,
        splitLine,
        uid
      };
    } while (true);
  }

  _splitLine(line) {
    return line.split(this._separator).map(item => item.trim());
  }
}

class TwoCSVReader extends Readable {
  constructor (options = {}) {
    options.objectMode = true;
    super(options);

    const separator = options.separator || ',';

    this.rightLineReader = this._createLineReader(options.rightInputPath, options.rightSource, separator);
    this.leftLineReader = this._createLineReader(options.leftInputPath, options.leftSource, separator);

    this.rightLine = this.rightLineReader.next();
    this.leftLine = this.leftLineReader.next();
    this.readCount = 0;
  }

  _createLineReader(inputPath, source, separator) {
    const lineReader = new CSVLineReader({
      inputPath,
      separator,
      source,
    });

    lineReader.on('error', (...args) => {
      this.emit('error', ...args);
    });
    lineReader.on('fatal', (...args) => {
      this.emit('fatal', ...args);
    });

    return lineReader;
  }

  _read () {
    // do the reading and pushing in a nextTick to give the GC some time
    // to free memory, otherwise things get *really* slow after ~ 2.8M reads.
    process.nextTick(() => {
      if (! this.leftLine.finished || ! this.rightLine.finished) {
        this.readCount++;
        this.emit('read', this.readCount);
        // uids are zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz if there is no line.
        // This allows the process to continue when one list is longer
        // than the other.
        const comparison = this.leftLine.uid.localeCompare(this.rightLine.uid);

        if (comparison < 0) {
          this.push({
            left: this.leftLine,
            type: 'left',
          });
          this.leftLine = this.leftLineReader.next();
        } else if (! comparison) {
          this.push({
            left: this.leftLine,
            right: this.rightLine,
            type: 'both',
          });

          this.rightLine = this.rightLineReader.next();
          this.leftLine = this.leftLineReader.next();
        } else {
          this.push({
            right: this.rightLine,
            type: 'right',
          });
          this.rightLine = this.rightLineReader.next();
        }
      } else {
        this.push(null);
      }
    });
  }
}

module.exports = TwoCSVReader;
