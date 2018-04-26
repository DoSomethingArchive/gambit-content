'use strict';

const config = require('../../config/lib/helpers/command');

/**
 * @return {String}
 */
function getRequestSupportCommand() {
  return config.commands.requestSupport.value;
}

/**
 * @return {String}
 */
function getStartCommand() {
  return config.commands.start.value;
}

module.exports = {
  getRequestSupportCommand,
  getStartCommand,
};
