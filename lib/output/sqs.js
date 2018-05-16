/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const AWS = require('aws-sdk');
const EventEmitter = require('events');

class SQSOutput extends EventEmitter {
  constructor(region) {
    super();

    // Credentials are expected to be setup already, see
    // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html
    this.sqs = new AWS.SQS({ region });
  }

  write (message) {
    return this.sqs.sendMessage(message, (error, data) => {
      if (error) {
        error.data = message;
        this.emit('error', error);
      } else {
        this.emit('sent', data);
      }
    });
  }

  close () {

  }
}

module.exports = SQSOutput;