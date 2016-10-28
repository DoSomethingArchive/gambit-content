'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const NotFoundError = require('../exceptions/NotFoundError');
const UnprocessibleEntityError = require('../exceptions/UnprocessibleEntityError');
const logger = app.locals.logger;

function successResponse(msg) {
  const response = {
    success: {
      code: 200,
      message: msg,
    },
  };

  return response;
}

router.post('/', (req, res) => {
  if (!req.body.id) {
    res.status(422).send({ error: 'id is required' });
  }
  const signupID = req.body.id;

  if (!req.body.source) {
    res.status(422).send({ error: 'source is required' });
  }
  const source = req.body.source;

  logger.debug(`POST /v1/signups { id:${signupID}, source:${source} }`);

  if (source === process.env.DS_API_POST_SOURCE) {
    const msg = `CampaignBot already sent confirmation for signup ${signupID} (source==${source}).`;

    return res.send(successResponse(msg));
  }

  let currentSignup;
  let currentCampaign;
  let chatbotMsg;

  return app.locals.db.signups
    .lookupByID(signupID)
    .then((signup) => {
      currentSignup = signup;
      if (!app.locals.campaigns[signup.campaign]) {
        const msg = `Campaign ID ${signup.campaign} is not enabled for CampaignBot.`;
        throw new UnprocessibleEntityError(msg);
      }

      return app.locals.db.users.lookup('id', currentSignup.user);
    })
    .then((user) => {
      if (!user) {
        const msg = `Northstar 404 for user {currentSignup.user} on signup ${signupID}.`;
        throw new NotFoundError(msg);
      }

      if (!user.mobile) {
        throw new UnprocessibleEntityError('Missing user mobile.');
      }

      const scope = req;
      scope.user = user;
      scope.signup = currentSignup;
      currentCampaign = app.locals.campaigns[currentSignup.campaign];

      const controller = app.locals.controllers.campaignBot;
      chatbotMsg = controller.renderResponseMessage(scope, 'menu_signedup_external');

      user.current_campaign = currentCampaign._id;
      return user.save();
    })
    .then((user) => {
      user.postMobileCommonsProfileUpdate(process.env.MOBILECOMMONS_OIP_CHATBOT, chatbotMsg);

      return res.send(successResponse(chatbotMsg));
    })
    .catch(NotFoundError, (err) => {
 
      return res.status(404).send({ error: err.msg });
    })
    .catch(UnprocessibleEntityError, (err) => {
 
      return res.status(422).send({ error: err.msg });
    });
});

module.exports = router;

