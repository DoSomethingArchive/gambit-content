'use strict';

// Routes
const broadcastsIndexRoute = require('./broadcasts/index');
const broadcastsSingleRoute = require('./broadcasts/single');
const campaignsSingleRoute = require('./campaigns/single');
const contentfulEntriesIndexRoute = require('./contentfulEntries/index');
const contentfulEntriesSingleRoute = require('./contentfulEntries/single');
const defaultTopicTriggersRoute = require('./defaultTopicTriggers');
const topicsSingleRoute = require('./topics/single');
const statusRoute = require('./status');

// middleware config
const authenticateConfig = require('../../config/lib/middleware/authenticate');

// middleware
const enforceHttpsMiddleware = require('../../lib/middleware/enforce-https');
const timeoutMiddleware = require('../../lib/middleware/timeouts');
const authenticateMiddleware = require('../../lib/middleware/authenticate');

function regGlobalMiddleware(app) {
  // Enforce https
  app.use(enforceHttpsMiddleware(app.locals.forceHttps));

  // 504 timeouts middleware
  Object.keys(timeoutMiddleware).forEach((name) => {
    app.use(timeoutMiddleware[name]);
  });

  // authenticate
  app.use(authenticateMiddleware(authenticateConfig));
}

module.exports = function init(app) {
  regGlobalMiddleware(app);
  app.get('/', statusRoute);

  // Returns data for a Contentful entry.
  app.use('/v1/contentfulEntries/:contentfulId', contentfulEntriesSingleRoute);

  // Returns list of Contentful entries.
  app.use('/v1/contentfulEntries/', contentfulEntriesIndexRoute);

  // Provides data for a chatbot broadcast.
  app.use('/v1/broadcasts/:broadcastId', broadcastsSingleRoute);

  // Provides list of chatbot broadcasts.
  app.use('/v1/broadcasts', broadcastsIndexRoute);

  // Provides keywords and templates for a single Campaign.
  app.use('/v1/campaigns/:campaignId', campaignsSingleRoute);

  // Provides list of defaultTopicTriggers
  app.use('/v1/defaultTopicTriggers', defaultTopicTriggersRoute);

  // Provides data for a chatbot topic.
  app.use('/v1/topics/:topicId', topicsSingleRoute);
};
