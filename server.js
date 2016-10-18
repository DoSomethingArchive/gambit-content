require('newrelic'); // eslint-disable-line strict
// @see https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration
// New Relic is required on first line, otherwise would declare 'use strict' for line 1 per eslint

// Wrapper around require to set relative path at app root
global.rootRequire = function (name) {
  return require(`${__dirname}/${name}`);
};

const express = require('express');
const http = require('http');

// Default is 5. Increasing # of concurrent sockets per host.
http.globalAgent.maxSockets = 100;

const logger = rootRequire('lib/logger');

// Used by legacy reportback endpoint:
const phoenix = rootRequire('lib/phoenix')();
const username = process.env.DS_PHOENIX_API_USERNAME;
const password = process.env.DS_PHOENIX_API_PASSWORD;
phoenix.userLogin(username, password, (err, response) => {
  if (err) {
    logger.error(err);
  }
  if (response && response.statusCode === 200) {
    logger.info('Successfully logged in to %s Phoenix API.', process.env.NODE_ENV);
  }
});

app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// TODO: I don't think we need this?
app.use(require('connect-multiparty')());

const errorHandler = require('errorhandler');
app.use(errorHandler());

const locals = rootRequire('config/locals');

require('./config/router');

app.locals.clients = {};

app.locals.clients.northstar = locals.getNorthstarClient();
if (!app.locals.clients.northstar) {
  logger.error('app.locals.clients.northstar undefined');
  process.exit(1);
}

app.locals.clients.phoenix = locals.getPhoenixClient();
if (!app.locals.clients.phoenix) {
  logger.error('app.locals.clients.phoenix undefined');
  process.exit(1);
}

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const uri = process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder';
const conn = mongoose.createConnection(uri);
locals.loadDb(conn);

conn.on('connected', () => {
  logger.info(`conn.readyState:${conn.readyState}`);

  app.locals.controllers = {};

  const promises = [
    locals.loadCampaigns(),
    locals.loadCampaignBotController(),
  ];

  Promise.all(promises).then(() => {
    const port = process.env.PORT || 5000;
    return app.listen(port, () => {
      logger.info(`Gambit is listening, port:${port} env:${process.env.NODE_ENV}.`);
    });
  });
});
