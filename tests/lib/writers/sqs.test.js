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
    })
  };

  sqsWriter = new SQSWriter({
    sqs: sqsMock
  });
});

test('_write sends to SQS, calls the callback', () => {
  const snsMessage = { key: 'value' };
  const callbackMock = jest.fn();

  sqsWriter._write(snsMessage, null, callbackMock);

  expect(sqsMock.sendMessage).toHaveBeenCalledTimes(1);
  expect(sqsMock.sendMessage.mock.calls[0][0]).toEqual(snsMessage);

  expect(callbackMock).toHaveBeenCalledTimes(1);
});
