'use strict';

const config = require('../../config/lib/helpers/command');

function getRequestSupportCommand() {
  return config.commands.requestSupport.value;
}

function getStartCommand() {
  return config.commands.start.value;
}

module.exports = {
  getRequestSupportCommand,
  getStartCommand,
};
