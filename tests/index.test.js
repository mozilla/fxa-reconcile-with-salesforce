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
  writerMock.create = jest.fn();
  writerMock.update = jest.fn();
  writerMock.delete = jest.fn();

  errorStreamMock = {
    write: jest.fn()
  };
  manager = new ReconciliationManager(readerMock, writerMock, errorStreamMock);
});

test('errors are propagated to the errorStream', () => {
  writerMock.emit('error', {
    message: 'this is the error message',
    data: { key: 'value' }
  });

  expect(errorStreamMock.write).toHaveBeenCalledTimes(1);
  let writeArg = errorStreamMock.write.mock.calls[0][0];
  expect(writeArg).toContain(JSON.stringify({key: 'value'}));
});

test('create delegates to writer.create', () => {
  readerMock.emit('create', {
    createDate: '2018-05-18T11:52:10.154Z',
    email: 'email',
    locale: 'locale',
    timestamp: 'timestamp',
    uid: 'uid',
  });

  expect(writerMock.create).toHaveBeenCalledTimes(1);
  expect(writerMock.create).toBeCalledWith('uid', 'email', 'locale', 'timestamp', '2018-05-18T11:52:10.154Z');
});

test('update delegates to writer.update', () => {
  readerMock.emit('update', {
    email: 'email',
    timestamp: 'timestamp',
    uid: 'uid',
  });

  expect(writerMock.update).toHaveBeenCalledTimes(1);
  expect(writerMock.update).toBeCalledWith('uid', 'email', 'timestamp');
});


test('delete delegates to writer.delete', () => {
  readerMock.emit('delete', {
    email: 'email',
    timestamp: 'timestamp',
    uid: 'uid',
  });

  expect(writerMock.delete).toHaveBeenCalledTimes(1);
  expect(writerMock.delete).toBeCalledWith('uid', 'email', 'timestamp');
});

test('complete closes the writer, outputs counts to the stream', () => {
  readerMock.emit('complete', {
    create: 1,
    update: 2,
    delete: 3,
    ignore: 4
  });

  expect(writerMock.close).toHaveBeenCalledTimes(1);

  expect(errorStreamMock.write).toHaveBeenCalledTimes(1);
  let writeArg = errorStreamMock.write.mock.calls[0][0];
  expect(writeArg).toContain('"actionable": 6');
  expect(writeArg).toContain('"create": 1');
  expect(writeArg).toContain('"update": 2');
  expect(writeArg).toContain('"delete": 3');
  expect(writeArg).toContain('"ignore": 4');
});