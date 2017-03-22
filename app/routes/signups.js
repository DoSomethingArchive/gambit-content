'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const contentful = require('../../lib/contentful');
const phoenix = require('../../lib/phoenix');
const helpers = require('../../lib/helpers');
const ClosedCampaignError = require('../exceptions/ClosedCampaignError');
const NotFoundError = require('../exceptions/NotFoundError');
const UnprocessibleEntityError = require('../exceptions/UnprocessibleEntityError');
// Requiring Bluebird overrides native promises,
// which we need for our exception handling logic in this endpoint.
const Promise = require('bluebird'); // eslint-disable-line no-unused-vars
const logger = app.locals.logger;
// Models.
const Signup = require('../models/Signup');
const User = require('../models/User');


router.post('/', (req, res) => {
  app.locals.stathat('route: v1/signups');

  if (!req.body.id) {
    return helpers.sendResponse(res, 422, 'Missing required id.');
  }
  const signupId = req.body.id;

  if (!req.body.source) {
    return helpers.sendResponse(res, 422, 'Missing required source.');
  }
  const source = req.body.source;

  logger.info(`signups id:${signupId} source:${source}`);

  if (source === process.env.DS_API_POST_SOURCE) {
    const msg = `CampaignBot only sends confirmation when source not equal to ${source}.`;

    return helpers.sendResponse(res, 208, msg);
  }

  const scope = req;
  scope.client = 'external_signup';

  return Signup.lookupById(signupId)
    .then((signup) => {
      scope.signup = signup;

      return phoenix.fetchCampaign(signup.campaign);
    })
    .then((phoenixCampaign) => {
      if (phoenix.isClosedCampaign(phoenixCampaign)) {
        throw new ClosedCampaignError(phoenixCampaign);
      }
      scope.campaign = phoenixCampaign;

      return contentful.fetchKeywordsForCampaignId(phoenixCampaign.id);
    })
    .then((keywords) => {
      if (keywords.length === 0) {
        const msg = `Campaign ${scope.campaign.id} does not have any Gambit keywords.`;
        throw new UnprocessibleEntityError(msg);
      }

      return User.lookup('id', scope.signup.user);
    })
    .then((user) => {
      if (!user.mobile) {
        throw new UnprocessibleEntityError('Missing required user.mobile.');
      }
      scope.user = user;

      return contentful.renderMessageForPhoenixCampaign(scope.campaign, 'menu_signedup_external');
    })
    .then((messageBody) => {
      scope.response_message = helpers.addSenderPrefix(messageBody);
      // Set current_campaign first and assume user isn't in the middle of a chatbot conversation
      // for a different campaign.
      // TODO: Refactor to set current_campaign upon user.postMobileCommonsProfileUpdate success.
      scope.user.current_campaign = scope.campaign.id;

      return scope.user.save();
    })
    .then((user) => {
      logger.debug(`updated user:${user._id} current_campaign:${user.current_campaign}`);

      // TODO: Promisify postMobileCommonsProfileUpdate and send success if we know the
      // Mobile Commons Profile Update request succeeded.
      const oip = process.env.MOBILECOMMONS_OIP_CHATBOT;
      user.postMobileCommonsProfileUpdate(oip, scope.response_message);

      return helpers.sendResponse(res, 200, scope.response_message);
    })
    .catch(NotFoundError, err => helpers.sendResponse(res, 404, err.message))
    .catch(ClosedCampaignError, err => helpers.sendResponse(res, 422, err.message))
    .catch(UnprocessibleEntityError, err => helpers.sendResponse(res, 422, err.message))
    .catch(err => helpers.sendResponse(res, 500, err.message));
});

module.exports = router;
