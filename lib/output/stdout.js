const EventEmitter = require('events');

class StdoutOutput extends EventEmitter {
  write (message) {
    const output = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
    process.stdout.write(output);
    this.emit('sent', message);
  }
}

module.exports = StdoutOutput;