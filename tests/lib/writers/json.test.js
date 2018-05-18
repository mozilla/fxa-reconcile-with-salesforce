/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 const EventEmitter = require('events');
 const JSONWriter = require('../../../lib/writers/json');

let jsonWriter;
let outputStreamMock;

beforeEach(() => {
  outputStreamMock = {
    write: jest.fn()
  }

  jsonWriter = new JSONWriter(outputStreamMock);
});

test('create writes the expected output to the outputStream', () => {
  jsonWriter.create('uid', 'email', 'locale', 'timestamp', 'createDate');

  expect(outputStreamMock.write).toHaveBeenCalledTimes(1);
  expect(outputStreamMock.write).toBeCalledWith(JSON.stringify({
    createDate: 'createDate',
    email: 'email',
    event: 'verified',
    locale: 'locale',
    timestamp: 'timestamp',
    uid: 'uid'
  }) + '\n');
});

test('delete writes the expected output to the outputStream', () => {
  jsonWriter.delete('uid', 'email', 'timestamp');

  expect(outputStreamMock.write).toHaveBeenCalledTimes(1);
  expect(outputStreamMock.write).toBeCalledWith(JSON.stringify({
    email: 'email',
    event: 'delete',
    timestamp: 'timestamp',
    uid: 'uid'
  }) + '\n');
});

test('update writes the expected output to the outputStream', () => {
  jsonWriter.update('uid', 'email', 'timestamp');

  expect(outputStreamMock.write).toHaveBeenCalledTimes(1);
  expect(outputStreamMock.write).toBeCalledWith(JSON.stringify({
    email: 'email',
    event: 'primaryEmailChanged',
    timestamp: 'timestamp',
    uid: 'uid'
  }) + '\n');
});

test('_writeEvent appends a `\n` on each line', () => {
  const data = { key: 'value' };
  const stringifiedData = JSON.stringify(data);

  jsonWriter._writeEvent(data);
  jsonWriter._writeEvent(data);
  jsonWriter._writeEvent(data);

  expect(outputStreamMock.write).toHaveBeenCalledTimes(3);
  expect(outputStreamMock.write.mock.calls[0][0]).toBe(stringifiedData + '\n');
  expect(outputStreamMock.write.mock.calls[1][0]).toBe(stringifiedData + '\n');
  expect(outputStreamMock.write.mock.calls[2][0]).toBe(stringifiedData + '\n');
});