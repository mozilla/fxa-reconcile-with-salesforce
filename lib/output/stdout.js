
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EventEmitter = require('events');

class StdoutOutput extends EventEmitter {
  constructor (messagePrefix = '', messageSuffix = '') {
    super();

    this.prefix = messagePrefix;
    this.suffix = messageSuffix;
  }

  write (message) {
    const output = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
    process.stdout.write(this.prefix + output + this.suffix);
    this.emit('sent', message);
  }
}

module.exports = StdoutOutput;