require ('newrelic');

// Wrapper around require to set relative path at app root
global.rootRequire = function(name) {
  return require(__dirname + '/' + name);
}

const express = require('express');
const http = require('http');
const logger = rootRequire('lib/logger');
const phoenix = rootRequire('lib/phoenix')();
const NorthstarClient = require('@dosomething/northstar-js');
const PhoenixClient = require('@dosomething/phoenix-js');

// Default is 5. Increasing # of concurrent sockets per host.
http.globalAgent.maxSockets = 100;

phoenix.userLogin(
  process.env.DS_PHOENIX_API_USERNAME,
  process.env.DS_PHOENIX_API_PASSWORD,
  function(err, response, body) {
    if (response && response.statusCode == 200) {
      logger.info('Successfully logged in to %s Phoenix API.', process.env.NODE_ENV);
    }
  });

/**
 * Express Setup - note app as global variable
 */
app = express();

const appConfig = require('./config')();
const router = require('./api/router');
const smsConfigsLoader = require('./config/smsConfigsLoader');

app.locals.northstarClient = new NorthstarClient({
  baseURI: process.env.DS_NORTHSTAR_API_BASEURI,
  apiKey: process.env.DS_NORTHSTAR_API_KEY,
});

app.locals.phoenixClient = new PhoenixClient({
  baseURI: process.env.DS_PHOENIX_API_BASEURI,
  username: process.env.DS_PHOENIX_API_USERNAME,
  password: process.env.DS_PHOENIX_API_PASSWORD,
});

// Retrieves all SMS config files before starting server.
smsConfigsLoader(() => {
  const port = (process.env.PORT || 5000);
  app.listen(port, () => {
    logger.info(`Gambit is listening, port:${port} env:${process.env.NODE_ENV}.`);
  });
});


