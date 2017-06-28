'use strict';

class Command {
  constructor(execute, args) {
    this.execute = execute;
    this.args = args;
  }
}

module.exports = Command;
