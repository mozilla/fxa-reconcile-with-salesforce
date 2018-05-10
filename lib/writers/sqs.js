const AWS = require('aws-sdk');
const EventEmitter = require('events');

const MESSAGES = {
  CHANGE_PRIMARY_EMAIL: 'primaryEmailChanged',
  CREATE_USER: 'verified',
  DELETE_USER: 'delete',
};

class SQS extends EventEmitter {
  constructor (queueUrl, queueRegion, shouldSend = false) {
    super();

    // Credentials are expected to be setup already, see
    // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html
    this.sqs = new AWS.SQS({ region: queueRegion });
    this.queueUrl = queueUrl;
    this.shouldSend = shouldSend;
  }

  create (uid, email, locale='en_US') {
    console.log('create', uid, email);
    return this._sendMessage({
      email,
      event: MESSAGES.CREATE_USER,
      locale,
      marketingOptIn: undefined,
      uid,
    });
  }

  delete (uid, email) {
    console.log('delete', uid, email);
    return this._sendMessage({
      event: MESSAGES.DELETE_USER,
      uid
    });
  }

  update (uid, email) {
    console.log('change', uid, email);
    return this._sendMessage({
      email,
      event: MESSAGES.CHANGE_PRIMARY_EMAIL,
      uid,
    });
  }

  close () {

  }

  _sendMessage (data) {
    return new Promise((resolve, reject) => {
      const msg = Object.assign({}, data, {
        // From https://github.com/mozilla/fxa-auth-server/blob/690ba822cbb00866b49454bf4a2e07edef0e7d89/lib/log.js#L128
        // Add a timestamp that this event occurred to help attached services resolve any
        // potential timing issues
        ts: data.ts || Date.now() / 1000 // Convert to float seconds
      });

      const messageAttributes = this._formatMessageAttributes(msg);

      const params = {
        MessageAttributes: messageAttributes,
        // That's right, double encode that thing!
        // See https://github.com/mozmeao/basket/blob/97c6ea1cbbbe142b1005fb741ba1a0205a45189a/basket/news/management/commands/process_fxa_queue.py#L79:L80
        // Basket first json.loads the message body, then it json.loads
        // the 'Message' field from the message body.
        MessageBody: JSON.stringify({
          Message: JSON.stringify(msg),
        }),
        QueueUrl: this.queueUrl
      };

      if (! this.shouldSend) {
        const data = { dryrun: true, params };
        this.emit('sent', data);
        resolve(data);
      } else {
        this.sqs.sendMessage(params, (err, data) => {
          if (err) {
            this.emit('error', err);
            reject(err);
          } else {
            this.emit('sent', data);
            resolve(data);
          }
        });
      }
    });
  }

  _formatMessageAttributes (msg) {
    // Lifted from https://github.com/mozilla/fxa-auth-server/blob/690ba822cbb00866b49454bf4a2e07edef0e7d89/lib/notifier.js#L31
    const attrs = {}
    attrs.event_type = {
      DataType: 'String',
      StringValue: msg.event
    }
    if (msg.email) {
      attrs.email_domain = {
        DataType: 'String',
        StringValue: msg.email.split('@')[1]
      }
    }
    return attrs
  }
}

module.exports = SQS;