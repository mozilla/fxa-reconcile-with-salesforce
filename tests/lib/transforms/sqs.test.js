/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const SQSTransform = require('../../../lib/transforms/sqs');

let sqsTransform;

const TIMESTAMP_MS = 1526936236748;
const TIMESTAMP_SECONDS = TIMESTAMP_MS / 1000;
const TIMESTAMP = new Date(TIMESTAMP_MS);
const CREATE_DATE_MS = 1473453024553;
const CREATE_DATE_SECONDS = CREATE_DATE_MS / 1000;
const CREATE_DATE = new Date(CREATE_DATE_MS);

const msToSeconds = (ms) => ms / 1000;

beforeEach(() => {
  sqsTransform = new SQSTransform({
    queueUrl: 'http://sqs.queue.url'
  });
});

test('_transform pushes the expected output to the queuem', () => {
  let callbackMock = jest.fn();
  sqsTransform.push = jest.fn();

  const msg = {
    createDate: CREATE_DATE,
    email: 'testuser@testuser.com',
    event: 'verified',
    locale: 'locale',
    timestamp: TIMESTAMP,
    uid: 'uid',
  };
  sqsTransform._transform(msg, null, callbackMock);

  expect(sqsTransform.push).toHaveBeenCalledTimes(1);
  const params = sqsTransform.push.mock.calls[0][0];

  expect(params).toEqual({
    MessageAttributes: {
      email_domain: {
        DataType: 'String',
        StringValue: 'testuser.com'
      },
      event_type: {
        DataType: 'String',
        StringValue: 'verified'
      },
    },
    MessageBody: JSON.stringify({ Message: JSON.stringify({
      createDate: CREATE_DATE_SECONDS,
      email: 'testuser@testuser.com',
      event: 'verified',
      locale: 'locale',
      uid: 'uid', // note, this cannot be sorted after ts or else the test fails.
      ts: TIMESTAMP_SECONDS,
    })}),
    QueueUrl: 'http://sqs.queue.url'
  });

  expect(callbackMock).toHaveBeenCalledTimes(1);
});
