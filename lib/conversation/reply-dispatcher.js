'use strict';

const logger = require('winston');

// TODO: Should this be a singleton?
class ReplyDispatcher {
  constructor() {
    this.commands = [];
  }
  execute(command) {
    logger.info(`executing command: ${command.args}`);
    this.commands.push(command);
    return command.execute(...command.args);
  }
}

module.exports = ReplyDispatcher;
