/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Transform } = require('stream');

class FxaDeleteReconcilingStream extends Transform {
  constructor (options = {}) {
    options.readableObjectMode = true;
    options.writableObjectMode = true;

    super(options);

    this.counts = {
      delete: 0,
      error: 0,
      ignoreNotInSalesforce: 0,
      salesforceNotDeleted: 0
    };
  }

  _transform(chunk, encoding, callback) {
    this[chunk.type](chunk);

    callback(null);
  }

  _flush () {
    const counts = this.counts;

    counts.totalSalesforceCSV = counts.delete + counts.salesforceNotDeleted;
    counts.totalDeleteCSV = counts.delete + counts.ignoreNotInSalesforce;
  }

  left ({ left }) {
    // Entry is in the delete db only, ignore it. It was never added to Salesforce.
    this.counts.ignoreNotInSalesforce++;
  }

  right ({ right }) {
    // Line is in the salesforce db only, write to output.
    this.counts.salesforceNotDeleted++;
    this.push(right.line);
  }

  both ({ left, right }) {
    // Line is in both salesforce and the delete dbs. Remove
    // from Salesforce so the fxa/salesforce reconciliation
    // script does not send a duplicate delete event.
    this.counts.delete++;
  }

}

module.exports = FxaDeleteReconcilingStream;

