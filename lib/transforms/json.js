/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Transform } = require('stream');

class JSONTransform extends Transform {
  constructor(options={}) {
    options.objectMode = true;
    super(options);

    this.suffix = options.suffix || '';
  }

  _transform(item, encoding, callback) {
    this.push(JSON.stringify(item) + this.suffix);
    callback();
  }
}

module.exports = JSONTransform;
