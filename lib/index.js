/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

class ReconciliationManager {
  constructor (reader, writer) {
    this.reader = reader;

    writer.on('error', (err) => {
      console.error('Error writing', err);
    });

    writer.on('sent', (data) => {
      //console.log('sent', JSON.stringify(data));
    });

    reader.on('create', ({ uid, email, locale }) => writer.create(uid, email, locale));
    reader.on('update', ({ uid, email }) => writer.update(uid, email));
    reader.on('delete', ({ uid, email }) => writer.delete(uid, email));
    reader.on('complete', (counts) => {
      writer.close()
      if (counts) {
        counts.actionable = counts.create + counts.update + counts.delete;
        counts.total = counts.actionable + counts.ignore;
        process.stderr.write(`\nCounts:\n${JSON.stringify(counts, null, 2)}`);
      }
    });
  }

  run () {
    this.reader.run();
  }
}

module.exports = ReconciliationManager;