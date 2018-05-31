const EventEmitter = require('events');
const ReconciliationManager = require('../lib');

let errorStreamMock;
let readerMock;
let writerMock;
let manager;

let errorStreamWrite;

beforeEach(() => {
  readerMock = new EventEmitter();
  readerMock.run = jest.fn();

  writerMock = new EventEmitter();
  writerMock.close = jest.fn();

  errorStreamMock = {
    write: jest.fn()
  };
  manager = new ReconciliationManager(readerMock, writerMock, errorStreamMock);
});

test('writer errors are propagated to the errorStream', () => {
  writerMock.emit('write-error', {
    message: 'this is the error message',
    data: { key: 'value' }
  });

  expect(errorStreamMock.write).toHaveBeenCalledTimes(1);
  let writeArg = errorStreamMock.write.mock.calls[0][0];
  expect(writeArg).toContain(JSON.stringify({key: 'value'}));
});

test('reader errors are propagated to the errorStream', () => {
  readerMock.emit('error', {
    message: 'this is the error message',
    data: { key: 'value' }
  });

  expect(errorStreamMock.write).toHaveBeenCalledTimes(1);
  let writeArg = errorStreamMock.write.mock.calls[0][0];
  expect(writeArg).toContain(JSON.stringify({key: 'value'}));
});

test('complete outputs counts to the stream', () => {
  readerMock.emit('complete', {
    create: 1,
    update: 2,
    delete: 3,
    ignore: 4
  });

  expect(errorStreamMock.write).toHaveBeenCalledTimes(1);
  let writeArg = errorStreamMock.write.mock.calls[0][0];
  expect(writeArg).toContain('"actionable": 6');
  expect(writeArg).toContain('"create": 1');
  expect(writeArg).toContain('"update": 2');
  expect(writeArg).toContain('"delete": 3');
  expect(writeArg).toContain('"ignore": 4');
});

