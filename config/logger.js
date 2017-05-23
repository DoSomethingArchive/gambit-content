'use strict';

const logger = require('winston');
require('winston-mongodb').MongoDB; // eslint-disable-line no-unused-expressions

const WINSTON_LEVEL = process.env.LOGGING_LEVEL || 'info';

module.exports = function init(options) {
  logger.configure({
    transports: [
      new logger.transports.Console({
        prettyPrint: true,
        colorize: true,
        level: WINSTON_LEVEL,
      }),
      new logger.transports.MongoDB({
        db: options.dbUri,
        level: WINSTON_LEVEL,
      }),
    ],
  });
};
