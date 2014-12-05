// Nodejitsu specifies NODE_ENV='production' by default
if (process.env.NODE_ENV == 'production') {
  require('newrelic');
}

var express = require('express')
    , path = require('path')
    , logger = require('./app/lib/logger')
    , http = require('http')
    ;

// Set application root to global namespace
global.appRoot = path.resolve(__dirname);

// Default is 5. Increasing # of concurrent sockets per host.
http.globalAgent.maxSockets = 20;

/**
 * Express Setup - note app as global variable
 */
app = express();

var config = require('./app/config')();
var router = require('./app/router');

// Start server
app.listen(app.get('port'), function() {
  logger.log('info', 'Express server listening on port %d in %s mode...\n\n', app.get('port'), app.settings.env);
});
