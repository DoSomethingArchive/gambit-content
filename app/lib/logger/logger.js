var winston = require('winston')
  ;

require('winston-mongodb').MongoDB;

var mongoDbUri = process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder';
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
    new winston.transports.Console({prettyPrint: true, colorize: true, level: 'info'}),
    new winston.transports.MongoDB({dbUri: mongoDbUri, collection: 'logs_winston', level: 'info'})
  ],
  exceptionHandlers: [
    new winston.transports.Console({prettyPrint: true, colorize: true}),
    new winston.transports.MongoDB({dbUri: mongoDbUri, collection: 'logs_exceptions'})
  ]
  });

module.exports = logger;
