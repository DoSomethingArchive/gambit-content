'use strict';

const logger = require('winston');

// TODO: Should this be a singleton?
class ReplyDispatcher {
  static execute(command) {
    logger.info(`executing command: ${command.args}`);
    return command.execute(...command.args);
  }
}

module.exports = ReplyDispatcher;
