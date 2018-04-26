'use strict';

const config = require('../../config/lib/helpers/command');

function getStartCommand() {
  return config.commands.start.value;
}

module.exports = {
  getStartCommand,
};
