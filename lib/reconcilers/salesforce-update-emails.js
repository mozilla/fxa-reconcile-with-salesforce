/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Transform } = require('stream');

class SalesforceUpdateEmailReconcilingStream extends Transform {
  constructor (options = {}) {
    options.readableObjectMode = true;
    options.writableObjectMode = true;

    super(options);

    this.counts = {
      error: 0,
      ignoreAlreadyEqual: 0,
      ignoreNotInSalesforce: 0,
      ignoreSalesforceOnly: 0,
      update: 0
    };
  }

  _transform(chunk, encoding, callback) {
    this[chunk.type](chunk);

    callback(null);
  }

  _flush () {
    const counts = this.counts;

    counts.totalSalesforceCSV = counts.ignoreSalesforceOnly + counts.ignoreAlreadyEqual + counts.update;
    counts.totalUpdateCSV = counts.ignoreAlreadyEqual + counts.ignoreNotInSalesforce + counts.update;
  }

  left ({ left }) {
    // Entry is in the update db only, ignore it.
    this.counts.ignoreNotInSalesforce++;
  }

  right ({ right }) {
    // Line is in the salesforce db only, write to output.
    this.counts.ignoreSalesforceOnly++;
    this.push(right.line);
  }

  both ({ left, right }) {
    // email was updated, update in the Salesforce CSV
    // so that FXA does not send a duplicate `update`
    // event from the reconcilliation script.
    const originalEmail = right.splitLine[1];
    const updatedEmail = left.splitLine[1];

    if (originalEmail !== updatedEmail) {
      this.push(`${right.line.replace(right.splitLine[1], updatedEmail)}`);
      this.counts.update++;
    } else {
      this.counts.ignoreAlreadyEqual++;
    }
  }

}

module.exports = SalesforceUpdateEmailReconcilingStream;

