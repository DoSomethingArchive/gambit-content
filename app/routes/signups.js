'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const logger = require('winston');
// Requiring Bluebird overrides native promises,
// which we need for our exception handling logic in this endpoint.
const Promise = require('bluebird'); // eslint-disable-line no-unused-vars

const contentful = require('../../lib/contentful');
const helpers = require('../../lib/helpers');
const phoenix = require('../../lib/phoenix');
const stathat = require('../../lib/stathat');
const ClosedCampaignError = require('../exceptions/ClosedCampaignError');
const UnprocessibleEntityError = require('../exceptions/UnprocessibleEntityError');
const Signup = require('../models/Signup');
const User = require('../models/User');

/**
 * Validate required body parameters.
 */
router.use((req, res, next) => {
  stathat.postStat('route: v1/signups');
  logger.debug(`signups post:${JSON.stringify(req.body)}`);

  if (!req.body.id) {
    return helpers.sendResponse(res, 422, 'Missing required id.');
  }

  if (!req.body.source) {
    return helpers.sendResponse(res, 422, 'Missing required source.');
  }

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
      req.signup = signup; // eslint-disable-line no-param-reassign
      return next();
    })
    .catch(err => helpers.sendResponse(res, 500, err.message));
});

/**
 * Check that Signup is for an active Campaign.
 */
router.use((req, res, next) => {
  phoenix.fetchCampaign(req.signup.campaign)
    .then((phoenixCampaign) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }
      if (phoenix.isClosedCampaign(phoenixCampaign)) {
        const err = new ClosedCampaignError(phoenixCampaign);
        return helpers.sendResponse(res, 422, err.message);
      }
      req.campaign = phoenixCampaign; // eslint-disable-line no-param-reassign
      return next();
    })
    .catch(err => helpers.sendResponse(res, 500, err.message));
});

/**
 * Check that Campaign has published keywords.
 */
router.use((req, res, next) => {
  contentful.fetchKeywordsForCampaignId(req.campaign.id)
    .then((keywords) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }
      if (keywords.length === 0) {
        const msg = `Campaign ${req.campaign.id} does not have any Gambit keywords.`;
        throw new UnprocessibleEntityError(msg);
      }
      return next();
    })
    .catch(UnprocessibleEntityError, err => helpers.sendResponse(res, 422, err.message))
    .catch(err => helpers.sendResponse(res, 500, err.message));
});

/**
 * Check that the Signup User has a mobile number.
 */
router.use((req, res, next) => {
  User.lookup('id', req.signup.user)
    .then((user) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }
      if (!user.mobile) {
        throw new UnprocessibleEntityError('Missing required user.mobile.');
      }
      req.user = user; // eslint-disable-line no-param-reassign
      return next();
    })
    .catch(UnprocessibleEntityError, err => helpers.sendResponse(res, 422, err.message))
    .catch(err => helpers.sendResponse(res, 500, err.message));
});

/**
 * Render the External Signup Message.
 */
router.use((req, res, next) => {
  contentful.renderMessageForPhoenixCampaign(req.campaign, 'menu_signedup_external')
    .then((message) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }
      req.signupMessage = helpers.addSenderPrefix(message); // eslint-disable-line no-param-reassign
      return next();
    })
    .catch(err => helpers.sendResponse(res, 500, err.message));
});

/**
 * Set User's current campaign to the Signup campaign.
 * TODO: Refactor to set current_campaign upon user.postMobileCommonsProfileUpdate success.
 */
router.use((req, res, next) => {
  req.user.current_campaign = req.campaign.id; // eslint-disable-line no-param-reassign
  req.user.save();
  next();
});

/**
 * Let's finally send that message!
 */
router.post('/', (req, res) => {
  if (req.timedout) {
    return helpers.sendTimeoutResponse(res);
  }
  // TODO: Promisify postMobileCommonsProfileUpdate and send success if we know the
  // Mobile Commons Profile Update request succeeded.
  try {
    const oip = process.env.MOBILECOMMONS_OIP_CHATBOT;
    req.user.postMobileCommonsProfileUpdate(oip, req.signupMessage);

    return helpers.sendResponse(res, 200, req.signupMessage);
  } catch (err) {
    return helpers.sendResponse(res, 500, err.message);
  }
});

module.exports = router;
