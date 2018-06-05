/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Transform } = require('stream');

class SQSTransform extends Transform {
  constructor (options = {}) {
    options.readableObjectMode = true;
    options.writableObjectMode = true;

    super(options);
  }

  _transform (msg, encoding, callback) {
    const msgToSend = { ...msg };
    msgToSend.ts = this._normalizeJSONDate(msg.timestamp);
    delete msgToSend.timestamp;

    if (msgToSend.createDate) {
      msgToSend.createDate = this._normalizeJSONDate(msgToSend.createDate);
    }

    const messageAttributes = this._formatMessageAttributes(msgToSend);

    const params = {
      MessageAttributes: messageAttributes,
      // That's right, double encode that thing!
      // See https://github.com/mozmeao/basket/blob/97c6ea1cbbbe142b1005fb741ba1a0205a45189a/basket/news/management/commands/process_fxa_queue.py#L79:L80
      // Basket first json.loads the message body, then it json.loads
      // the 'Message' field from the message body.
      MessageBody: JSON.stringify({
        Message: JSON.stringify(msgToSend),
      })
    };

    this.push(params);
    callback();
  }

  _formatMessageAttributes (msg) {
    // Lifted from https://github.com/mozilla/fxa-auth-server/blob/690ba822cbb00866b49454bf4a2e07edef0e7d89/lib/notifier.js#L31
    const attrs = {};
    attrs.event_type = { // eslint-disable-line camelcase
      DataType: 'String',
      StringValue: msg.event
    };
    if (msg.email) {
      attrs.email_domain = { // eslint-disable-line camelcase
        DataType: 'String',
        StringValue: msg.email.split('@')[1]
      };
    }
    return attrs;
  }

  _normalizeJSONDate (iso8601Date) {
    // from https://github.com/mozilla/fxa-auth-server/blob/690ba822cbb00866b49454bf4a2e07edef0e7d89/lib/log.js#L128,
    // convert timestamp to a float, in seconds.
    return new Date(iso8601Date).getTime() / 1000;
  }

}

module.exports = SQSTransform;
