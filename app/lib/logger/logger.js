var winston = require('winston')
  ;

require('winston-mongodb').MongoDB;

var mongoDbUri = process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder';
var logger = new (winston.Logger) ({
  transports: [
    new winston.transports.Console(),
    // @todo Will be submitting a PR to winston-mongodb to allow for multiple 
    // transports to the same uri.
    // new winston.transports.MongoDB({name: 'mongodb-info', dbUri: mongoDbUri, collection: 'logs_info', level: 'info'}),
    // new winston.transports.MongoDB({name: 'mongodb-error', dbUri: mongoDbUri, collection: 'logs_error', level: 'error'})
    // @todo In the meantime, we'll just report errors
    new winston.transports.MongoDB({name: 'mongodb-error', dbUri: mongoDbUri, collection: 'logs_error', level: 'error'})
  ],
  exceptionHandlers: [
    new winston.transports.MongoDB({dbUri: mongoDbUri, collection: 'logs_exceptions'})
  ]
});

module.exports = logger;
