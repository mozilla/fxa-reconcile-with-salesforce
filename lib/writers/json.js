/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EventEmitter = require('events');

const MESSAGES = {
  CHANGE_PRIMARY_EMAIL: 'primaryEmailChanged',
  CREATE_USER: 'verified',
  DELETE_USER: 'delete',
};

class JSONWriter extends EventEmitter {
  constructor(outputStream) {
    super();

    this.outputStream = outputStream;
    this.outputStream.write('[');
    this.messageCount = 0;
  }

  create (uid, email, locale='en_US') {
    this._writeEvent({
      event: MESSAGES.CREATE_USER,
      email,
      locale,
      uid,
    });
  }

  delete (uid, email) {
    this._writeEvent({
      event: MESSAGES.DELETE_USER,
      email,
      uid,
    });
  }

  update (uid, email) {
    this._writeEvent({
      event: MESSAGES.CHANGE_PRIMARY_EMAIL,
      email,
      uid,
    });
  }

  close () {
    this.outputStream.write(']');
  }

  _writeEvent (event) {
    if (this.messageCount) {
      this.outputStream.write(',\n');
    }
    this.messageCount++;
    this.outputStream.write(JSON.stringify(event));
  }
}

module.exports = JSONWriter;
