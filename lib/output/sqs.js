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
    return this.sqs.sendMessage(message, (err, data) => {
      if (err) {
        this.emit('error', err);
      } else {
        this.emit('sent', data);
      }
    });
  }

  close () {

  }
}

module.exports = SQSOutput;