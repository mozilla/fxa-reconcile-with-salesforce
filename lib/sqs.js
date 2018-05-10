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

  createUser (uid, email) {
    console.log('create', uid, email);
    return this._sendMessage(MESSAGES.CREATE_USER, {
      uid,
      email,
      locale: 'en_US',
      marketingOptIn: undefined
    });
  }

  deleteUser (uid, email) {
    console.log('delete', uid, email);
    return this._sendMessage(MESSAGES.DELETE_USER, {
      uid
    });
  }

  changePrimaryEmail (uid, email) {
    console.log('change', uid, email);
    return this._sendMessage(MESSAGES.CHANGE_PRIMARY_EMAIL, {
      uid,
      email
    });
  }

  _sendMessage (eventName, data) {
    return new Promise((resolve, reject) => {
      const msg = Object.assign({}, data, {
        event: eventName,
        // From https://github.com/mozilla/fxa-auth-server/blob/690ba822cbb00866b49454bf4a2e07edef0e7d89/lib/log.js#L128
        // Add a timestamp that this event occurred to help attached services resolve any
        // potential timing issues
        ts: data.ts || Date.now() / 1000 // Convert to float seconds
      });

      const messageAttributes = this._formatMessageAttributes(msg);

      const params = {
        MessageAttributes: messageAttributes,
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