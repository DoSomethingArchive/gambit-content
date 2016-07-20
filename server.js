// Wrapper around require to set relative path at app root
global.rootRequire = function(name) {
  return require(__dirname + '/' + name);
}

var express = require('express')
  , path = require('path')
  , http = require('http')
  , logger = rootRequire('app/lib/logger')
  , dscontentapi = rootRequire('app/lib/ds-content-api')()
  ;

// Default is 5. Increasing # of concurrent sockets per host.
http.globalAgent.maxSockets = 100;

// Authenticate app with Phoenix API.
dscontentapi.userLogin(
  process.env.DS_CONTENT_API_USERNAME,
  process.env.DS_CONTENT_API_PASSWORD,
  function(err, response, body) {
    if (response && response.statusCode == 200) {
      logger.info('Successfully logged in to Phoenix API.',
        '\n\tsessid: ' + body.sessid,
        '\n\tsession_name: ' + body.session_name,
        '\n\ttoken: ' + body.token);
    }
  });

/**
 * Express Setup - note app as global variable
 */
app = express();

var appConfig = require('./app/config')()
  , router = require('./app/router')
  , smsConfigsLoader = require('./app/config/smsConfigsLoader')
  ;

// Retrieves all SMS config files before starting server.
smsConfigsLoader(function() {
  app.listen(app.get('port'), function() {
    logger.log('info', 'Express server listening on port %d in %s mode...\n\n', app.get('port'), app.settings.env);
  });
})