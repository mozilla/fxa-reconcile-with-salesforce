/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Transform } = require('stream');

class PrefixSuffixTransform extends Transform {
  constructor (options) {
    super(options);
    this.prefix = options.prefix || '';
    this.suffix = options.suffix || '';
  }

  _transform (chunk, encoding, callback) {
    this.push(this.prefix + chunk.toString('utf8') + this.suffix);
    callback(null);
  }
}

module.exports = PrefixSuffixTransform;
