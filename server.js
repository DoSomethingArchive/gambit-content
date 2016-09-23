require ('newrelic');

// Wrapper around require to set relative path at app root
global.rootRequire = function(name) {
  return require(__dirname + '/' + name);
}

var express = require('express');
var path = require('path');
var http = require('http');
var logger = rootRequire('lib/logger');
var phoenix = rootRequire('lib/phoenix')();

const NorthstarClient = require('@dosomething/northstar-js');

// Default is 5. Increasing # of concurrent sockets per host.
http.globalAgent.maxSockets = 100;

phoenix.userLogin(
  process.env.DS_CONTENT_API_USERNAME,
  process.env.DS_CONTENT_API_PASSWORD,
  function(err, response, body) {
    if (response && response.statusCode == 200) {
      logger.info('Successfully logged in to %s Phoenix API.', process.env.NODE_ENV);
    }
  });

/**
 * Express Setup - note app as global variable
 */
app = express();

var appConfig = require('./config')();
var router = require('./api/router');
var smsConfigsLoader = require('./config/smsConfigsLoader');

// Retrieves all SMS config files before starting server.
smsConfigsLoader(function() {
  var port = process.env.PORT || 5000;
  app.listen(port, function() {
    logger.log('info', 'Express server listening on port %d in %s mode...\n\n', port, app.settings.env);
  });
});

app.locals.northstarClient = new NorthstarClient({
  baseURI: process.env.NORTHSTAR_API_BASEURI,
  apiKey: process.env.NORTHSTAR_API_KEY,
});
