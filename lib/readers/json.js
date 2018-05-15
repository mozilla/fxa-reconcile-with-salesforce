/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 const EventEmitter = require('events');

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
     const input = require(this.jsonInputPath);

     const counts = {
      create: 0,
      update: 0,
      delete: 0,
      ignore: 0,
    };

     input.forEach((item) => {
       const eventName = item.event;
       this.emit(MESSAGES[item.event], item);

       counts[MESSAGES[eventName]]++;
    });

     this.emit('complete', counts);
   }
 }

 module.exports = JSONReader;
