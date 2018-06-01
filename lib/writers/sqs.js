/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const AWS = require('aws-sdk');
const { Writable } = require('stream');

class SQSWriter extends Writable {
  constructor(options = {}) {
    options.objectMode = true;
    super(options);

    // Credentials are expected to be setup already, see
    // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html
    this.sqs = options.sqs || new AWS.SQS({ region: options.region });
  }

  _write (message, encoding, callback) {
    return this.sqs.sendMessage(message, (error, data) => {
      this.emit('sent', message);
      if (error) {
        error.data = message;
      }
      callback(error);
    });
  }

  close () {

  }
}

module.exports = SQSWriter;