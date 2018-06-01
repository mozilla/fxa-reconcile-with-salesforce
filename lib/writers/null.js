/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Writable } = require('stream');

class NullWriter extends Writable {
  constructor(options = {}) {
    options.objectMode = true;
    super(options);
  }

  _write (message, encoding, callback) {
    callback(null);
  }
};

module.exports = NullWriter;
