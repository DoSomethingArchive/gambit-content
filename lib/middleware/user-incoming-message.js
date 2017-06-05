'use strict';

const underscore = require('underscore');
const logger = require('winston');
const helpers = require('../helpers');

module.exports = function checkUserIncomingMessage(config = {}) {
  return (req, res, next) => {
    const incomingMessageFound = underscore.some(Object.keys(config.incomingMessageTypes),
    (name) => {
      const incomingMessageValue = req[config.containerProperty][name];
      if (incomingMessageValue) {
        logger.info(`Receiving: ${config.incomingMessageTypes[name]}`);
      }
      return incomingMessageValue;
    });

    if (!incomingMessageFound) {
      const msg = `Missing an incoming message type: ${Object.keys(config.incomingMessageTypes).join(', ')}`;
      return helpers.sendUnproccessibleEntityResponse(res, msg);
    }
    return next();
  };
};
