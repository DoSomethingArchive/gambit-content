// Nodejitsu specifies NODE_ENV='production' by default
if (process.env.NODE_ENV == 'production') {
  require('newrelic');
}

var express = require('express')
    , path = require('path')
    , logger = require('./app/lib/logger')
    ;

// Set application root to global namespace
global.appRoot = path.resolve(__dirname);

/**
 * Express Setup - note app as global variable
 */
app = express();

var config = require('./app/config')(app, express);
var router = require('./app/routes')(app, express);

// Start server
app.listen(app.get('port'), function() {
  logger.log('info', 'Express server listening on port %d in %s mode...\n\n', app.get('port'), app.settings.env);
});
