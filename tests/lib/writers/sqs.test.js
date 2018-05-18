/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 const EventEmitter = require('events');
 const SQSWriter = require('../../../lib/writers/sqs');

let sqsWriter;
let outputStreamMock;

beforeEach(() => {
  outputStreamMock = {
    on: jest.fn(),
    write: jest.fn()
  };
  sqsWriter = new SQSWriter('http://sqs.queue.url', outputStreamMock, 'timestamp2');
});

test('create writes the expected output to the outputStream', () => {
  sqsWriter._writeEvent = jest.fn();
  sqsWriter.create('uid', 'email', 'locale', 'timestamp', 'createDate');

  expect(sqsWriter._writeEvent).toHaveBeenCalledTimes(1);
  expect(sqsWriter._writeEvent).toBeCalledWith({
    createDate: 'createDate',
    email: 'email',
    event: 'verified',
    locale: 'locale',
    marketingOptIn: undefined,
    ts: 'timestamp',
    uid: 'uid'
  });
});

test('delete writes the expected output to the outputStream', () => {
  sqsWriter._writeEvent = jest.fn();
  sqsWriter.delete('uid', 'email', 'timestamp');

  expect(sqsWriter._writeEvent).toHaveBeenCalledTimes(1);
  expect(sqsWriter._writeEvent).toBeCalledWith({
    event: 'delete',
    ts: 'timestamp',
    uid: 'uid'
  });
});

test('update writes the expected output to the outputStream', () => {
  sqsWriter._writeEvent = jest.fn();
  sqsWriter.update('uid', 'email', 'timestamp');

  expect(sqsWriter._writeEvent).toHaveBeenCalledTimes(1);
  expect(sqsWriter._writeEvent).toBeCalledWith({
    email: 'email',
    event: 'primaryEmailChanged',
    ts: 'timestamp',
    uid: 'uid'
  });
});

test('_writeEvent writes the expected fields', () => {
  const msg = {
    email: 'testuser@testuser.com',
    event: 'delete',
    ts: 'timestamp'
  };
  sqsWriter._writeEvent(msg);

  expect(outputStreamMock.write).toHaveBeenCalledTimes(1);
  const params = outputStreamMock.write.mock.calls[0][0];

  expect(params).toEqual({
    MessageAttributes: {
      event_type: {
        DataType: 'String',
        StringValue: 'delete'
      },
      email_domain: {
        DataType: 'String',
        StringValue: 'testuser.com'
      }
    },
    MessageBody: JSON.stringify({ Message: JSON.stringify(msg) }),
    QueueUrl: 'http://sqs.queue.url'
  });
});