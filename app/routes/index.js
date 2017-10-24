'use strict';

// Routes
const campaignsRoute = require('./campaigns');
const campaignsIndexRoute = require('./campaigns-index');
const chatbotRoute = require('./chatbot');
const receiveMessageRoute = require('./receive-message');
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

  // Provides Gambit keywords and tempaltes for a single Phoenix Campaign.
  app.use('/v1/campaigns/:campaignId', campaignsRoute);

  // Provides list of Phoenix Campaigns currently running on Gambit.
  app.use('/v1/campaigns', campaignsIndexRoute);

  // Receives inbound message from Mobile Commons mData.
  app.use('/v1/chatbot', chatbotRoute);

  // Receives inbound message from Gambit Conversations service.
  app.use('/v1/receive-message', receiveMessageRoute);

  // Sends external Signup message to a User for a Campaign.
  app.use('/v1/signups', signupsRoute);
};
