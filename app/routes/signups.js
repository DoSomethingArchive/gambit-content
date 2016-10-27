'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const CampaignNotFoundError = require('../exceptions/CampaignNotFoundError');
const logger = app.locals.logger;

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
    return res.send(`Already sent confirmation for signup ${signupID} with source ${source}.`);
  }

  let currentSignup;

  return app.locals.db.signups
    .lookupByID(signupID)
    .then((signup) => {
      currentSignup = signup;
      if (!app.locals.campaigns[signup.campaign]) {
        throw new CampaignNotFoundError();
      }

      return app.locals.db.users.lookup('id', currentSignup.user);
    })
    .then((user) => {
      if (!user) {
        return res.status(500).send({ error: 'Cannot find user for signup' });
      }

      return user.setCurrentCampaign(currentSignup);
    })
    .then((user) => {
      const scope = req;
      scope.user = user;
      scope.signup = currentSignup;
      scope.campaign = app.locals.campaigns[currentSignup.campaign];
      const controller = app.locals.controllers.campaignBot;
      const msg = controller.renderResponseMessage(scope, 'menu_signedup_external');
      user.postMobileCommonsProfileUpdate(req, process.env.MOBILECOMMONS_OIP_CHATBOT, msg);

      return res.send(msg);
    })
    .catch(CampaignNotFoundError, () => {
      const msg = `Campaign ${currentSignup.campaign} is not a CampaignBot campaign.`;
      logger.warn(msg);

      return res.status(422).send({ error: msg });
    });
});

module.exports = router;

