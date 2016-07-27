var winston = require('winston')
  ;

require('winston-mongodb').MongoDB;

var mongoDbUri = process.env.LOGGING_DB_URI || 'mongodb://localhost/ds-mdata-responder';
var loggingLevel = process.env.LOGGING_LEVEL || 'info';

var logger = new (winston.Logger) ({
  levels: {
    verbose: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4
  },
  colors: {
    verbose: 'cyan',
    debug: 'blue',
    info: 'green',
    warn: 'yellow',
    error: 'red'
  },
  transports: [
    new winston.transports.Console({prettyPrint: true, colorize: true, level: loggingLevel}),
    new winston.transports.MongoDB({dbUri: mongoDbUri, collection: 'logs_winston', level: loggingLevel})
  ],
  exceptionHandlers: [
    new winston.transports.Console({prettyPrint: true, colorize: true}),
    new winston.transports.MongoDB({dbUri: mongoDbUri, collection: 'logs_exceptions'})
  ]
  });

module.exports = logger;
