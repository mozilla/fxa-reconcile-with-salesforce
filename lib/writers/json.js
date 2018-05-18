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
    this.messageCount = 0;
  }

  create (uid, email, locale, timestamp, createDate) {
    this._writeEvent({
      createDate,
      email,
      event: MESSAGES.CREATE_USER,
      locale,
      timestamp,
      uid,
    });
  }

  delete (uid, email, timestamp) {
    this._writeEvent({
      email,
      event: MESSAGES.DELETE_USER,
      timestamp,
      uid,
    });
  }

  update (uid, email, timestamp) {
    this._writeEvent({
      email,
      event: MESSAGES.CHANGE_PRIMARY_EMAIL,
      timestamp,
      uid,
    });
  }

  close () {
  }

  _writeEvent (event) {
    this.messageCount++;
    this.outputStream.write(JSON.stringify(event) + '\n');
  }
}

module.exports = JSONWriter;
