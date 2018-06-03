/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const AWS = require('aws-sdk');
const { Writable } = require('stream');
const uuid = require('uuid');

const MAX_CHUNKS_PER_BATCH = 10;

class SQSWriter extends Writable {
  constructor(options = {}) {
    options.objectMode = true;
    super(options);

    // Credentials are expected to be setup already, see
    // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html
    this.sqs = options.sqs || new AWS.SQS({ region: options.region });
    this.queueUrl = options.queueUrl;
  }

  // sends a single message
  _write (chunk, encoding, callback) {
    this._sendMessage(this._chunkToMessage(chunk))
      .then(() => callback(null), () => callback(null));
  }

  // sends messages in bulk
  _writev (chunks, callback) {
    const numBatches = Math.ceil(chunks.length / MAX_CHUNKS_PER_BATCH);
    const batches = chunks.reduce((batches, chunk, index) => {
      // using % should split the chunks evenly across the batches.
      const batch = this._getBatch(batches, index % numBatches);
      batch.Entries.push(this._chunkToBatchEntry(chunk));
      return batches;
    }, []);

    Promise
      .all(batches.map((batch) => this._sendMessageBatch(batch)))
      .then(() => callback(null), () => callback(null));
  }

  _sendMessage(message) {
    return new Promise((resolve, reject) => {
      this.sqs.sendMessage(message, (error, data) => {
        this.emit('sent', message);
        if (error) {
          error.data = message;
          // emitting an `error` message causes the stream
          // to close and no further messages can be sent.
          // If there is a send error, emit a `write-error`
          // instead, the error will be logged and we
          // can attempt to resend.
          this.emit('write-error', error);
          reject(error);
          return;
        }
        resolve(null);
      });
    });
  }

  _sendMessageBatch(batch) {
    return new Promise((resolve, reject) => {
      this.sqs.sendMessageBatch(batch, (error, data) => {
        if (error) {
          error.data = data;
          this.emit('write-error', error);
          reject(error);
          return;
        }

        data.Successful.forEach((item) => {
          // emit a sent event for each item so that
          // an accurate count of sent items can be maintained.
          this.emit('sent');
        });

        data.Failed.forEach((failure) => {
          this.emit('write-error', {
            data: batch.Entries.filter(entry => entry.Id === failure.Id)[0],
            message: failure.Message
          });
        });

        resolve(null);
      });
    });
  }

  _chunkToMessage(chunk) {
    chunk.QueueUrl = this.queueUrl;
    return chunk;
  }

  _chunkToBatchEntry(chunk) {
    chunk.chunk.Id = uuid.v4();
    return chunk.chunk;
  }

  _getBatch (batches, index) {
    if (! batches[index]) {
      batches[index] = {
        Entries: [],
        QueueUrl: this.queueUrl
      };
    }

    return batches[index];
  }

  close () {

  }
}

module.exports = SQSWriter;
