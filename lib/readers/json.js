/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Readable } = require('stream');
const readline = require('n-readlines');

const MESSAGES = {
  primaryEmailChanged: 'update',
  verified: 'create',
  delete: 'delete',
};

class JSONReader extends Readable {
  constructor (options) {
    options.objectMode = true;
    super(options);

    this.jsonLineReader = new readline(options.inputPath);
    this.counts = {
      create: 0,
      delete: 0,
      ignore: 0,
      lines: 0,
      update: 0,
    };
  }

  _read () {
    let line = this.jsonLineReader.next();
    if (! line) {
      this.push(null);

      this.emit('complete', this.counts);
      return;
    }

    this.counts.lines++;
    const item = JSON.parse(line);

    this.counts[MESSAGES[item.event]]++;
    this.push(item);
  }
}

 module.exports = JSONReader;
