/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const fs = require('fs');
const path = require('path');
const program = require('commander');
const uuid = require('node-uuid');

const StdOutOutput = require('../lib/output/stdout');
const { updateBucketStats, calculateBucketDistribution } = require('../lib/statistics');

program
  .option('-c, --count <count>', 'Total record count')
  .option('-f, --fxa [filename]', 'FxA CSV')
  .option('-s, --salesforce [filename]', 'Salesforce CSV')
  .option('-e, --expected [filename]', 'Expected test counts')
  .option('--pc [percentage]', '% of accounts that need to be created on Salesforce, defaults to 10%')
  .option('--pu [percentage]', '% of accounts that need to be updated on Salesforce, defaults to 5%')
  .option('--pd [percentage]', '% of accounts that need to be deleted on Salesforce, defaults to 10%')
  .option('--pi [percentage]', '% of accounts that have an invalid non-hex32 uid, defaults to 1%');

program.parse(process.argv);

const count = parseInt(program.count);
const percentCreate = parseInt(program.pc || '10');
const percentUpdate = parseInt(program.pu || '5');
const percentDelete = parseInt(program.pd || '10');
const percentInvalidUid = parseInt(program.pi || '1');

const fxaWriter = createFxaWriter(program);
const salesforceWriter = createSalesforceWriter(program);
generate(count, percentCreate, percentDelete, percentUpdate, percentInvalidUid, fxaWriter, salesforceWriter)
  .then((counts) => {
    let total = counts.ignore + counts.create + counts.update + counts.delete + counts.error;
    counts.total = total;
    const expected = JSON.stringify(counts, null, 2);
    console.log('Counts:\n', expected);
    if (program.expected) {
      fs.writeFileSync(path.resolve(process.cwd(), program.expected), expected)
    }
  });

async function generate(count, percentCreate, percentDelete, percentUpdate, percentInvalidUid, fxaStream, salesforceStream) {
  const deleteMax = percentCreate + percentDelete;
  const changeMax = deleteMax + percentUpdate;
  const invalidUidMax = changeMax + percentInvalidUid;
  const counts = {
    ignore: 0,
    create: 0,
    delete: 0,
    error: 0,
    update: 0,
  };
  const msSinceUnixEpoch = (new Date()).getTime();

  for (let i = 0; i < count; ++i) {
    const uid = uuid.v4().replace(/-/g, '');
    const number = Math.floor(Math.random() * 100);

    if (number < percentCreate) {
      // Creates only exist in FxA database.
      const email = base64(`${uid}@fxa.com`);
      const locale = base64('en');
      updateBucketStats(uid);
      await write(fxaStream, `${uid},${email},${locale},${msSinceUnixEpoch}\n`);
      counts.create++;
    } else if (number < deleteMax) {
      // Deletes only exist in Salesforce database.
      updateBucketStats(uid);
      await write(salesforceStream, `${uid},${uid}@salesforce.com\n`);
      counts.delete++;
    } else if (number < changeMax) {
      // Changes exist in both DBs, use FxA as canonical source.
      const email = base64(`${uid}@changed.com`);
      const locale = base64('en');
      updateBucketStats(uid);
      await write(fxaStream, `${uid},${email},${locale},${msSinceUnixEpoch}\n`);
      await write(salesforceStream, `${uid},${uid}@original.com\n`);
      counts.update++;
    } else if (number < invalidUidMax) {
      // Flip a coin and stick an invalid Uid in one of the streams
      const invalidUid = 'thedudeabides';
      const email = base64(`${uid}@invaliduid.com`);
      const locale = base64('en');
      if (Math.random() < 0.5) {
        await write(fxaStream, `${invalidUid},${email},${locale},${msSinceUnixEpoch}\n`);
      } else {
        await write(salesforceStream, `${invalidUid},${uid}@invaliduid.com\n`);
      }
      counts.error++;
    } else {
      // Entry exists in both DBs. Do nothing.
      const email = base64(`${uid}@same.com`);
      const locale = base64('en');
      await write(fxaStream, `${uid},${email},${locale},${msSinceUnixEpoch}\n`);
      await write(salesforceStream, `${uid},${uid}@same.com\n`);
      counts.ignore++;
    }
  }

  counts.stats = calculateBucketDistribution();
  return counts;
}

function base64(string) {
  return Buffer.from(string, 'utf8').toString('base64');
}

function write(outputStream, contents) {
  return new Promise((resolve, reject) => {
    const ok = outputStream.write(contents);

    if (! ok) {
      outputStream.once('drain', () => resolve());
    } else {
      resolve();
    }
  });
}

function createFxaWriter (program) {
  if (! program.fxa) {
    return new StdOutOutput('fxa       : ', '\n');
  } else {
    const outputPath = path.resolve(process.cwd(), program.fxa);
    return fs.createWriteStream(outputPath);
  }
}
function createSalesforceWriter (program) {
  if (! program.salesforce) {
    return new StdOutOutput('salesforce: ', '\n');
  } else {
    const outputPath = path.resolve(process.cwd(), program.salesforce);
    return fs.createWriteStream(outputPath);
  }
}
