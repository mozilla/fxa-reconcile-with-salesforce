/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const JSONTransform = require('../../../lib/transforms/json');

let jsonTransform;

beforeEach(() => {
  jsonTransform = new JSONTransform({ suffix: '\n'});
});

test('_transform stringifies the object, pushes to the queue, calls the callback', () => {
  const data = { key: 'value' };
  const callbackMock = jest.fn();

  jsonTransform.push = jest.fn();
  jsonTransform._transform(data, null, callbackMock);

  expect(jsonTransform.push).toHaveBeenCalledTimes(1);
  expect(jsonTransform.push.mock.calls[0][0]).toEqual(JSON.stringify(data) + '\n');

  expect(callbackMock).toHaveBeenCalledTimes(1);
});
