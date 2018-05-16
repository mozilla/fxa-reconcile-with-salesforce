/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 const EventEmitter = require('events');
 const readline = require('n-readlines');

 const MESSAGES = {
  primaryEmailChanged: 'update',
  verified: 'create',
  delete: 'delete',
};

 class JSONReader extends EventEmitter {
   constructor (jsonInputPath) {
     super();

     this.jsonInputPath = jsonInputPath;
   }

   run () {
    const jsonLineReader = new readline(this.jsonInputPath);

     const counts = {
      create: 0,
      update: 0,
      delete: 0,
      ignore: 0,
    };

    let line = jsonLineReader.next();
    while (line) {
      const item = JSON.parse(line);
      const eventName = item.event;
      this.emit(MESSAGES[item.event], item);

      counts[MESSAGES[eventName]]++;
      line = jsonLineReader.next();
    }

     this.emit('complete', counts);
   }
 }

 module.exports = JSONReader;
