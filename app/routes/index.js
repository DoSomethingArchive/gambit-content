'use strict';

// Routes
const campaignsRoute = require('./campaigns');
const chatbotRoute = require('./chatbot');
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
  app.use('/v1/campaigns', campaignsRoute);
  app.use('/v1/chatbot', chatbotRoute);
  app.use('/v1/signups', signupsRoute);
};
