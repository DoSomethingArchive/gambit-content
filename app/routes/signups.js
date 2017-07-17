'use strict';

const express = require('express');

const router = express.Router(); // eslint-disable-line new-cap
const logger = require('winston');
const newrelic = require('newrelic');

const contentful = require('../../lib/contentful');
const helpers = require('../../lib/helpers');
const phoenix = require('../../lib/phoenix');
const stathat = require('../../lib/stathat');
const ReplyDispatcher = require('../../lib/conversation/reply-dispatcher');
const replies = require('../../lib/conversation/replies');

const ClosedCampaignError = require('../exceptions/ClosedCampaignError');
const Signup = require('../models/Signup');
const User = require('../models/User');

// Config
const requiredParamsConf = require('../../config/middleware/signups/required-params');

// Middleware
const requiredParamsMiddleware = require('../../lib/middleware/required-params');


/**
 * Validate required body parameters.
 */
router.use(requiredParamsMiddleware(requiredParamsConf));

/**
 * Validate required body parameters.
 */
router.use((req, res, next) => {
  stathat.postStat('route: v1/signups');
  logger.debug(`signups post:${JSON.stringify(req.body)}`);

  newrelic.addCustomParameters({ signupId: req.body.id });
  const source = req.body.source;
  if (source === process.env.DS_API_POST_SOURCE) {
    const msg = `CampaignBot only sends confirmation when source not equal to ${source}.`;

    return helpers.sendResponse(res, 208, msg);
  }

  return next();
});

/**
 * Fetch Signup from DS API.
 */
router.use((req, res, next) => {
  Signup.lookupById(req.body.id)
    .then((signup) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }

      /* eslint-disable no-param-reassign */
      req.signup = signup;
      req.campaignId = req.signup.campaign;
      req.userId = req.signup.user;
      /* eslint-enable no-param-reassign */

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * Check that Signup is for an active Campaign.
 */
router.use((req, res, next) => {
  phoenix.fetchCampaign(req.campaignId)
    .then((phoenixCampaign) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }

      if (phoenix.isClosedCampaign(phoenixCampaign)) {
        const err = new ClosedCampaignError(phoenixCampaign);
        return helpers.sendUnproccessibleEntityResponse(res, err.message);
      }

      req.campaign = phoenixCampaign; // eslint-disable-line no-param-reassign
      newrelic.addCustomParameters({ campaignId: req.campaignId });

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * Check that Campaign has published keywords.
 */
router.use((req, res, next) => {
  contentful.fetchKeywordsForCampaignId(req.campaignId)
    .then((keywords) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }

      if (keywords.length === 0) {
        const msg = `Campaign ${req.campaignId} does not have any Gambit keywords.`;
        return helpers.sendUnproccessibleEntityResponse(res, msg);
      }

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * Check that the Signup User has a mobile number.
 */
router.use((req, res, next) => {
  User.lookup('id', req.userId)
    .then((user) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }
      if (!user.mobile) {
        return helpers.sendUnproccessibleEntityResponse(res, 'Missing required user.mobile.');
      }

      req.user = user; // eslint-disable-line no-param-reassign
      newrelic.addCustomParameters({ userId: req.userId });

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * Let's finally send that message!
 */
router.post('/', (req, res) => {
  if (req.timedout) {
    return helpers.sendTimeoutResponse(res);
  }

  // Set req.client to use when ReplyDispatcher creates a BotRequest model.
  // @see lib/middleware/map-request-params.
  req.client = 'signups-api';

  return ReplyDispatcher.execute(replies.externalSignupMenu({ req, res }));
});

module.exports = router;
