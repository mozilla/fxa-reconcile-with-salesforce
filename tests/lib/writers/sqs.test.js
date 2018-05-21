/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EventEmitter = require('events');
const SQSWriter = require('../../../lib/writers/sqs');

let sqsWriter;
let outputStreamMock;

const TIMESTAMP_MS = 1526936236748;
const TIMESTAMP_SECONDS = TIMESTAMP_MS / 1000;
const TIMESTAMP = new Date(TIMESTAMP_MS);
const CREATE_DATE_MS = 1473453024553;
const CREATE_DATE_SECONDS = CREATE_DATE_MS / 1000;
const CREATE_DATE = new Date(CREATE_DATE_MS);

const msToSeconds = (ms) => ms / 1000;

beforeEach(() => {
  outputStreamMock = {
    on: jest.fn(),
    write: jest.fn()
  };
  sqsWriter = new SQSWriter('http://sqs.queue.url', outputStreamMock, 'timestamp2');
});

test('create writes the expected output to the outputStream', () => {
  sqsWriter._writeEvent = jest.fn();
  sqsWriter.create('uid', 'email', 'locale', TIMESTAMP, CREATE_DATE);

  expect(sqsWriter._writeEvent).toHaveBeenCalledTimes(1);
  expect(sqsWriter._writeEvent).toBeCalledWith({
    createDate: CREATE_DATE_SECONDS,
    email: 'email',
    event: 'verified',
    locale: 'locale',
    marketingOptIn: undefined,
    ts: TIMESTAMP_SECONDS,
    uid: 'uid'
  });
});

test('delete writes the expected output to the outputStream', () => {
  sqsWriter._writeEvent = jest.fn();
  sqsWriter.delete('uid', 'email', TIMESTAMP);

  expect(sqsWriter._writeEvent).toHaveBeenCalledTimes(1);
  expect(sqsWriter._writeEvent).toBeCalledWith({
    event: 'delete',
    ts: TIMESTAMP_SECONDS,
    uid: 'uid'
  });
});

test('update writes the expected output to the outputStream', () => {
  sqsWriter._writeEvent = jest.fn();
  sqsWriter.update('uid', 'email', TIMESTAMP);

  expect(sqsWriter._writeEvent).toHaveBeenCalledTimes(1);
  expect(sqsWriter._writeEvent).toBeCalledWith({
    email: 'email',
    event: 'primaryEmailChanged',
    ts: TIMESTAMP_SECONDS,
    uid: 'uid'
  });
});

test('_writeEvent writes the expected fields', () => {
  const msg = {
    email: 'testuser@testuser.com',
    event: 'delete',
    ts: TIMESTAMP_SECONDS,
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