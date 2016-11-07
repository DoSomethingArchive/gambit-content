'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const NotFoundError = require('../exceptions/NotFoundError');
const UnprocessibleEntityError = require('../exceptions/UnprocessibleEntityError');
const logger = app.locals.logger;

function sendResponse(res, code, message) {
  let type = 'success';
  if (code > 200) {
    type = 'error';
    logger.error(message);
  }

  const response = {};
  response[type] = { code, message };

  return res.status(code).send(response);
}

router.post('/', (req, res) => {
  app.locals.stathat('route: v1/signups');

  if (!req.body.id) {
    return sendResponse(res, 422, 'Missing required id.');
  }
  const signupId = req.body.id;

  if (!req.body.source) {
    return sendResponse(res, 422, 'Missing required source.');
  }
  const source = req.body.source;

  logger.info(`POST signup:${signupId} source:${source}`);

  if (source === process.env.DS_API_POST_SOURCE) {
    const msg = `CampaignBot only sends confirmation when source not equal to ${source}.`;

    return sendResponse(res, 208, msg);
  }

  let currentSignup;
  let chatbotMessage;

  return app.locals.db.signups
    .lookupById(signupId)
    .then((signup) => {
      if (!app.locals.campaigns[signup.campaign]) {
        const msg = `Campaign ${signup.campaign} is not running on CampaignBot.`;
        throw new UnprocessibleEntityError(msg);
      }

      currentSignup = signup;

      return app.locals.db.users.lookup('id', signup.user);
    })
    .then((user) => {
      if (!user.mobile) {
        throw new UnprocessibleEntityError('Missing required user.mobile.');
      }

      // Render the chatbot message to send.
      const controller = app.locals.controllers.campaignBot;
      const scope = {
        user,
        campaign: app.locals.campaigns[currentSignup.campaign],
      };
      chatbotMessage = controller.renderResponseMessage(scope, 'menu_signedup_external');

      // Technically we don't want to ovewrite current_campaign until we know the Mobile Commons
      // message was delivered.. but responding to the message won't work correctly without
      // ensuring the current_campaign is set for our signup campaign. The ol' chicken and egg.
      // Set current_campaign first and assume user isn't in the middle of a chatbot conversation
      // for a different campaign.
      scope.user.current_campaign = currentSignup.campaign;

      return scope.user.save();
    })
    .then((user) => {
      logger.debug(`updated user:${user._id} current_campaign:${user.current_campaign}`);
      // TODO: Promisify postMobileCommonsProfileUpdate and send success if we know the
      // Mobile Commons Profile Update request succeeded.
      user.postMobileCommonsProfileUpdate(process.env.MOBILECOMMONS_OIP_CHATBOT, chatbotMessage);

      return sendResponse(res, 200, chatbotMessage);
    })
    .catch(NotFoundError, err => sendResponse(res, 404, err.message))
    .catch(UnprocessibleEntityError, err => sendResponse(res, 422, err.message))
    .catch(err => sendResponse(res, 500, err.message));
});

module.exports = router;

