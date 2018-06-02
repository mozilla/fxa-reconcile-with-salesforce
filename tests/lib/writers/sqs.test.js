/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const SQSWriter = require('../../../lib/writers/sqs');

let sqsMock;
let sqsWriter;

beforeEach(() => {
  sqsMock = {
    sendMessage: jest.fn(function (message, callback) {
      callback(null);
    }),

    sendMessageBatch: jest.fn(function (params, callback) {
      callback(null, { Successful: params.Entries });
    })
  };

  sqsWriter = new SQSWriter({
    queueUrl: 'http://sqs.queue.url',
    sqs: sqsMock
  });
});

test('_write sends to SQS, calls the callback', () => {
  const sqsMessage = { key: 'value' };
  return new Promise((resolve, reject) => {
    sqsWriter._write(sqsMessage, null, resolve);
  }).then(() => {
    expect(sqsMock.sendMessage).toHaveBeenCalledTimes(1);
    expect(sqsMock.sendMessage.mock.calls[0][0]).toEqual(sqsMessage);
  });
});

test('_writev sends a batch to SQS, calls the callback', () => {
  const sqsMessages = [];
  for (let i = 0; i < 20; ++i) {
    sqsMessages.push({ chunk: { key: `value${i}` }});
  }

  const sentStub = jest.fn();

  sqsWriter.on('sent', sentStub);

  return new Promise((resolve, reject) => {
    sqsWriter._writev(sqsMessages, resolve);
  }).then(() => {
    expect(sqsMock.sendMessageBatch).toHaveBeenCalledTimes(2);
    expect(sentStub).toHaveBeenCalledTimes(20);
  });
});
