'use strict';

const logger = require('winston');

const WINSTON_LEVEL = process.env.LOGGING_LEVEL || 'info';

module.exports = function init(options) {
  logger.configure({
    transports: [
      new logger.transports.Console({
        prettyPrint: true,
        colorize: true,
        level: WINSTON_LEVEL,
      }),
    ],
  });
};
