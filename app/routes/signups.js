'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const helpers = require('../../lib/helpers');
const NotFoundError = require('../exceptions/NotFoundError');
const UnprocessibleEntityError = require('../exceptions/UnprocessibleEntityError');
const Promise = require('bluebird'); // jshint ignore:line
const logger = app.locals.logger;


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

  return app.locals.db.signups
    .lookupById(signupId)
    .then((signup) => {
      scope.signup = signup;
      scope.campaign = app.locals.campaigns[signup.campaign];

      if (!scope.campaign) {
        const msg = `Campaign ${signup.campaign} is not running on CampaignBot.`;
        throw new UnprocessibleEntityError(msg);
      }
      if (scope.campaign.status === 'closed') {
        const msg = `Campaign ${signup.campaign} is closed on CampaignBot.`;
        throw new UnprocessibleEntityError(msg);
      }

      return app.locals.db.users.lookup('id', signup.user);
    })
    .then((user) => {
      if (!user.mobile) {
        throw new UnprocessibleEntityError('Missing required user.mobile.');
      }
      scope.user = user;

      const campaignBot = app.locals.campaignBot;
      scope.response_message = campaignBot.renderMessage(scope, 'menu_signedup_external');

      // Technically we don't want to ovewrite current_campaign until we know the Mobile Commons
      // message was delivered.. but responding to the message won't work correctly without
      // ensuring the current_campaign is set for our signup campaign. The ol' chicken and egg.
      // Set current_campaign first and assume user isn't in the middle of a chatbot conversation
      // for a different campaign.
      scope.user.current_campaign = scope.campaign._id;

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
    .catch(UnprocessibleEntityError, err => helpers.sendResponse(res, 422, err.message))
    .catch(err => helpers.sendResponse(res, 500, err.message));
});

module.exports = router;
