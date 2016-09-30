require('newrelic'); // eslint-disable-line strict
// @see https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration
// New Relic is required on first line, otherwise would declare 'use strict' for line 1 per eslint

// Wrapper around require to set relative path at app root
global.rootRequire = function (name) {
  return require(`${__dirname}/${name}`);
};

const express = require('express');
const http = require('http');
const logger = rootRequire('lib/logger');
const phoenix = rootRequire('lib/phoenix')();

// Default is 5. Increasing # of concurrent sockets per host.
http.globalAgent.maxSockets = 100;

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

require('./config')();

const smsConfigsLoader = require('./config/smsConfigsLoader');

require('./config/router');

const CampaignBotController = rootRequire('api/controllers/CampaignBotController');
const SlothBotController = rootRequire('api/controllers/SlothBotController');

// Load all configuration db collections before starting server.
smsConfigsLoader(() => {
  const port = (process.env.PORT || 5000);

  // TODO Create our controllers (which read from configs in smsConfigsLoader)
  // We'll need to loop through all campaignBots and store as array.
  app.locals.campaignBot = new CampaignBotController(41);
  app.locals.slothBot = new SlothBotController();

  app.listen(port, () => {
    logger.info(`Gambit is listening, port:${port} env:${process.env.NODE_ENV}.`);
  });
});
