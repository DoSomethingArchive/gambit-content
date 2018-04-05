'use strict';

// Routes
const campaignsIndexRoute = require('./campaigns/index');
const campaignsSingleRoute = require('./campaigns/single');
const receiveMessageRoute = require('./receive-message');

// TODO: Combine these?
const statusRoute = require('./status');
const homeRoute = require('./home');

// middleware config
const authenticateConfig = require('../../config/middleware/authenticate');

// middleware
const timeoutMiddleware = require('../../lib/middleware/timeouts');
const authenticateMiddleware = require('../../lib/middleware/authenticate');

function regGlobalMiddleware(app) {
  // 504 timeouts middleware
  Object.keys(timeoutMiddleware).forEach((name) => {
    app.use(timeoutMiddleware[name]);
  });

  // authenticate
  app.use(authenticateMiddleware(authenticateConfig));
}

module.exports = function init(app) {
  regGlobalMiddleware(app);
  app.get('/', homeRoute);
  app.use('/v1/status', statusRoute);

  // Provides keywords and templates for a single Campaign.
  app.use('/v1/campaigns/:campaignId', campaignsSingleRoute);

  // Provides list of Campaigns configured for Gambit.
  app.use('/v1/campaigns', campaignsIndexRoute);

  // Receives inbound message from Gambit Conversations service.
  app.use('/v1/receive-message', receiveMessageRoute);
};
