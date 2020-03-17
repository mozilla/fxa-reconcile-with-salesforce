/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EventEmitter = require('events');

class StreamManager extends EventEmitter {
  constructor (readerStream, writerStream, counterStream, statusStream) {
    super();

    writerStream.on('write-error', (error) => {
      statusStream.write(`\nWrite error\n> ${error.message}\n${JSON.stringify(error.data)}\n\n\n`);
    });

    writerStream.on('error', () => {});

    let lastReadCount;
    readerStream.on('read', (readCount) => {
      lastReadCount = readCount;
      if (readCount === 1) {
        statusStream.write('\n\n');
      }

      if (! (readCount % 10000)) {
        writeReadLines(statusStream, readCount);
      }
    });

    let readErrorCount = 0;
    readerStream.on('error', (error) => {
      readErrorCount++;
      statusStream.write(`\nRead error\n> ${error.message}\n${JSON.stringify(error.data)}\n`);
    });

    readerStream.on('fatal', (error) => {
      statusStream.write(`\nFatal Read error\n> ${error.message}\n${JSON.stringify(error.data)}\n`);
      writerStream.close();
      process.exit(1);
    });

    counterStream.on('finish', () => {
      writeReadLines(statusStream, lastReadCount);

      const counts = counterStream.counts;
      counts.error = readErrorCount;
      this.emit('complete', counts);
      statusStream.write(`\nCounts:\n${JSON.stringify(counts, null, 2)}\n\n`);
    });
  }
}

function writeReadLines(stream, readCount) {
  stream.write(`\rread: ${readCount}`);
}

module.exports = StreamManager;
