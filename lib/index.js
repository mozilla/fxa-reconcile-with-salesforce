/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

class ReconciliationManager {
  constructor (reader, writer, errorStream = process.stderr) {
    this.reader = reader;

    writer.on('write-error', (error) => {
      errorStream.write(`\nWrite error\n> ${error.message}\n${JSON.stringify(error.data)}\n\n\n`);
    });

    writer.on('error', () => {});

    reader.on('error', (error) => errorStream.write(`\nRead error\n> ${error.message}\n${JSON.stringify(error.data)}\n`));

    reader.on('fatal', (error) => {
      errorStream.write(`\nFatal Read error\n> ${error.message}\n${JSON.stringify(error.data)}\n`);
      writer.close();
      process.exit(1);
    });

    reader.on('complete', (counts) => {
      if (counts) {
        counts.actionable = counts.create + counts.update + counts.delete;
        counts.total = counts.actionable + counts.ignore;
        errorStream.write(`\nCounts:\n${JSON.stringify(counts, null, 2)}\n\n`);
      }
    });
  }
}

module.exports = ReconciliationManager;
