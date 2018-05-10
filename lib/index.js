//const SQS = require('./writer/sqs');

class Reconciler {
  constructor (queueUrl, queueRegion, reader, writer) {
    this.reader = reader;

    writer.on('error', (err) => {
      console.error('Error writing', err);
    });

    writer.on('sent', (data) => {
      console.log('sent', JSON.stringify(data));
    });

    reader.on('create', ({ uid, email, locale }) => writer.create(uid, email, locale));
    reader.on('update', ({ uid, email }) => writer.update(uid, email));
    reader.on('delete', ({ uid, email }) => writer.delete(uid, email));
    reader.on('complete', () => writer.close());
  }

  run () {
    this.reader.run();
  }
}

module.exports = Reconciler;