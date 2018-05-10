const SQS = require('./sqs');

class Reconciler {
  constructor (queueUrl, queueRegion, reader, isReal = false) {
    const salesforceSqs = new SQS(queueUrl, queueRegion, isReal);
    this.reader = reader;

    salesforceSqs.on('error', (err) => {
      console.error('Error sending', err);
    });

    salesforceSqs.on('sent', (data) => {
      console.log('sent', data);
    });

    reader.on('create', ({ uid, email, locale }) => salesforceSqs.createUser(uid, email, locale));
    reader.on('update', ({ uid, email }) => salesforceSqs.changePrimaryEmail(uid, email));
    reader.on('delete', ({ uid, email }) => salesforceSqs.deleteUser(uid, email));
  }

  run () {
    this.reader.run();
  }
}

module.exports = Reconciler;