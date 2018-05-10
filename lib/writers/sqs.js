const EventEmitter = require('events');

const MESSAGES = {
  CHANGE_PRIMARY_EMAIL: 'primaryEmailChanged',
  CREATE_USER: 'verified',
  DELETE_USER: 'delete',
};

class SQSWriter extends EventEmitter {
  constructor (queueUrl, outputStream) {
    super();

    this.queueUrl = queueUrl;

    this.outputStream = outputStream;
    outputStream.on('error', (err) => this.emit('error', err));
    outputStream.on('sent', (data) => this.emit('sent', data));
  }

  create (uid, email, locale) {
    return this._writeEvent({
      email,
      event: MESSAGES.CREATE_USER,
      locale,
      marketingOptIn: undefined,
      uid,
    });
  }

  delete (uid, email) {
    return this._writeEvent({
      event: MESSAGES.DELETE_USER,
      uid
    });
  }

  update (uid, email) {
    return this._writeEvent({
      email,
      event: MESSAGES.CHANGE_PRIMARY_EMAIL,
      uid,
    });
  }

  close () {
  }

  _writeEvent (data) {
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

    this.outputStream.write(params);
  }

  _formatMessageAttributes (msg) {
    // Lifted from https://github.com/mozilla/fxa-auth-server/blob/690ba822cbb00866b49454bf4a2e07edef0e7d89/lib/notifier.js#L31
    const attrs = {}
    attrs.event_type = {
      DataType: 'String',
      StringValue: msg.event
    };
    if (msg.email) {
      attrs.email_domain = {
        DataType: 'String',
        StringValue: msg.email.split('@')[1]
      }
    }
    return attrs;
  }
}

module.exports = SQSWriter;