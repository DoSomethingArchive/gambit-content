'use strict';

// Routes
const campaignsIndexRoute = require('./campaigns-index');
const campaignsSingleRoute = require('./campaigns-single');
const receiveMessageRoute = require('./receive-message');

// To be deprecated:
const chatbotRoute = require('./chatbot');
const sendMessageRoute = require('./campaigns');
const signupsRoute = require('./signups');
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

  app.use('/v1/campaigns/:campaignId/message', sendMessageRoute);

  // Provides keywords and templates for a single Campaign.
  app.use('/v1/campaigns/:campaignId', campaignsSingleRoute);

  // Provides list of Campaigns configured for Gambit.
  app.use('/v1/campaigns', campaignsIndexRoute);

  // Receives inbound message from Mobile Commons mData.
  app.use('/v1/chatbot', chatbotRoute);

  // Receives inbound message from Gambit Conversations service.
  app.use('/v1/receive-message', receiveMessageRoute);

  // Sends external Signup message to a User for a Campaign.
  app.use('/v1/signups', signupsRoute);
};
