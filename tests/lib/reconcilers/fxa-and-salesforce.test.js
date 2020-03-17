/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const FxaAndSalesforceReconciler = require('../../../lib/reconcilers/fxa-and-salesforce');
const uuid = require('uuid');

let reconciler;
const TIMESTAMP = 1527087211210;

beforeEach(() => {
  reconciler = new FxaAndSalesforceReconciler({
    timestamp: TIMESTAMP
  }); // eslint-disable-line no-unused-vars
  reconciler.push = jest.fn();
});

test('left', () => {
  const doneCallback = jest.fn();
  reconciler._transform({ left: {splitLine: [generateUUID(), 'testuser@testuser.com']}, type: 'left'}, null, doneCallback);
  reconciler._transform({ left: {splitLine: [generateUUID(), 'testuser2@testuser.com']}, type: 'left'}, null, doneCallback);

  expect(doneCallback).toHaveBeenCalledTimes(2);
  expect(reconciler.push).toHaveBeenCalledTimes(2);
  expect(reconciler.counts.delete).toBe(2);
});

test('right', () => {
  const doneCallback = jest.fn();
  reconciler._transform(
    {right: {splitLine: [generateUUID(), base64ToUtf8('testuser@testuser.com'), base64ToUtf8('en'), Date.now()]}, type: 'right'}, null, doneCallback);
  reconciler._transform(
    {right: {splitLine: [generateUUID(), base64ToUtf8('testuser2@testuser.com'), base64ToUtf8('de'), Date.now()]}, type: 'right'}, null, doneCallback);

  expect(doneCallback).toHaveBeenCalledTimes(2);
  expect(reconciler.push).toHaveBeenCalledTimes(2);
  expect(reconciler.counts.verified).toBe(2);
});

test('both', () => {
  const doneCallback = jest.fn();
  const uuid1 = generateUUID();
  const uuid2 = generateUUID();
  reconciler._transform({
    left: {
      splitLine: [uuid1, 'oldAddress@testuser.com']
    },
    right: {
      splitLine: [uuid1, base64ToUtf8('newAddress@testuser.com'), base64ToUtf8('en'), Date.now()]
    },
    type: 'both'
  }, null, doneCallback);
  reconciler._transform({
    left: {
      splitLine: [uuid2, 'ignore@testuser.com']
    },
    right: {
      splitLine: [uuid2, base64ToUtf8('ignore@testuser.com'), base64ToUtf8('en'), Date.now()]
    },
    type: 'both'
  }, null, doneCallback);

  expect(doneCallback).toHaveBeenCalledTimes(2);
  expect(reconciler.push).toHaveBeenCalledTimes(1);
  expect(reconciler.counts.primaryEmailChanged).toBe(1);
  expect(reconciler.counts.ignore).toBe(1);
});

test('_normalizeCSVDate converts a string to a date', () => {
  const date = reconciler._normalizeCSVDate('1473453024553');
  expect(date.getTime()).toBe(1473453024553);
});

test('_normalizeFxaCSVLocale trims locale', () => {
  expect(reconciler._normalizeFxaCSVLocale(utf8ToBase64('en'))).toBe('en');
  expect(reconciler._normalizeFxaCSVLocale(utf8ToBase64('  en  '))).toBe('en');
  expect(reconciler._normalizeFxaCSVLocale(utf8ToBase64('  en,en-US  '))).toBe('en,en-US');
});

test('_normalizeFxaCSVEmail trims email', () => {
  expect(reconciler._normalizeFxaCSVEmail(utf8ToBase64('someone@someone.com'))).toBe('someone@someone.com');
  expect(reconciler._normalizeFxaCSVEmail(utf8ToBase64(' someone@someone.com '))).toBe('someone@someone.com');
});

test('_parseFxaSplitLine parses the line, normalizes input', () => {
  const lineData = reconciler._parseFxaSplitLine(['UID', utf8ToBase64('testuser@testuser.com'), utf8ToBase64('en-US '), 1527087211213]);
  expect(lineData.createDate).toEqual(new Date(1527087211213));
  expect(lineData.email).toBe('testuser@testuser.com');
  expect(lineData.locale).toBe('en-US');
  expect(lineData.timestamp).toBe(TIMESTAMP);
  expect(lineData.uid).toBe('UID');
});

test('_parseSalesforceSplitLine parses the line, normalizes input', () => {
  const lineData = reconciler._parseSalesforceSplitLine(['UID','Email']);
  expect(lineData.email).toBe('Email');
  expect(lineData.timestamp).toBe(TIMESTAMP);
  expect(lineData.uid).toBe('UID');
});

function utf8ToBase64 (str) {
  return Buffer.from(str, 'utf8').toString('base64');
}


function base64ToUtf8(str) {
  return Buffer.from(str).toString('base64');
}

function generateUUID() {
  return uuid.v4().replace(/-/, '');
}
