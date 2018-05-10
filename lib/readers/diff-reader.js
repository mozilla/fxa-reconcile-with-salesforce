/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EventEmitter = require('events');
const fs = require('fs');
const readline = require('readline');

class DiffReader extends EventEmitter {
  constructor (inputPath, separator=',') {
    super();

    this.inputPath = inputPath;
    this.separator = separator;
  }

  run () {
    const fileReader = fs.createReadStream(this.inputPath);

    const lineReader = readline.createInterface({
      input: fileReader,
      crlfDelay: Infinity
    });


    lineReader.on('line', (input) => this._processLine(input));
    // no more input from the file, process the last chunk.
    lineReader.on('close', () => this._processChunk());
  }

  _processLine (input) {
    if (/^[-+]{3,3}/.test(input)) {
      // header info, ignore.
    } else if (/^\@/.test(input)) {
      // chunk info, either the beginning or end.
      // the chunk info is not needed, we'll just use it
      // as in indicator
      if (! this.chunk) {
        // beginning of the file
        this.chunk = [];
      } else {
        // end of a chunk. Process the current chunk,
        // then put the current chunk info as the beginning
        // of the next chunk.
        this._processChunk();

        // reset chunk
        this.chunk = [];
      }
    } else {
      this.chunk.push(input);
    }
  }

  _processChunk() {
    const results = this._parseChunk();
    if (results) {
      for (const uid in results.toCreate) {
        this.emit('create', { uid, email: results.toCreate[uid], locale: 'en' });
      }
      for (const uid in results.toUpdate) {
        this.emit('update', { uid, email: results.toUpdate[uid] });
      }
      for (const uid in results.toDelete) {
        this.emit('delete', { uid, email: results.toDelete[uid] });
      }
    }
  }

  _parseChunk () {
    return this.chunk.reduce((results, line) => {
      const sign = line[0];
      const [uid, email] = line.slice(1).split(this.separator);

      if (sign === '-') {
        // tentative remove. If a `+` entry comes afterwards
        // with the same uid, then it's an `update`.
        results.toRemove[uid] = email;
      } else if (sign === '+') {
        // if in the remove set, then it's an email change.
        if (results.toRemove[uid]) {
          delete results.toRemove[uid];
          results.toUpdate[uid] = email;
        } else {
          results.toCreate[uid] = email;
        }
      } else if (sign === ' ') {
        // no sign, in both. Ignore.
      } else {
        throw new Error(`Unexpected character at start of line: ${sign}`);
      }

      return results;
    }, { toRemove: {}, toCreate: {}, toUpdate: {} });
  }
}

module.exports = DiffReader;
