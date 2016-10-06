'use strict';

/**
 * Imports.
 */
const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const logger = rootRequire('lib/logger');
const mobilecommons = rootRequire('lib/mobilecommons');

/**
 * Handle chatbot conversations.
 */
router.post('/', (req, res) => {
  // TODO: Handle when Northstar ID doesn't exist.
  /* eslint-disable no-param-reassign */
  req.user_id = req.body.profile_northstar_id;
  req.user_mobile = req.body.phone;
  req.incoming_message = req.body.args;
  req.incoming_image_url = req.body.mms_image_url;
  /* eslint-enable no-param-reassign */

  logger.debug(`user:${req.user_id} msg:${req.incoming_message} img:${req.incoming_image_url}`);

  const botType = req.query.bot_type;

  if (botType === 'slothbot') {
    // TODO: Store as a config variable.
    const slothbotOptinPath = 210045;
    const msgTxt = app.locals.controllers.slothBot.renderResponseMessage(req);
    mobilecommons.chatbot(req.body, slothbotOptinPath, msgTxt);

    return res.send({ message: msgTxt });
  }

  if (botType === 'donorschoose' || botType === 'donorschoosebot') {
    return app.locals.controllers.donorsChooseBot.chatbot(req, res);
  }

  let mobilecommonsOip = process.env.MOBILECOMMONS_OIP_CAMPAIGNBOT;
  if (!mobilecommonsOip) {
    logger.error('MOBILECOMMONS_OIP_CAMPAIGNBOT undefined');

    return res.sendStatus(500);
  }

  let campaignId = req.query.campaign;
  let campaign;
  if (campaignId) {
    campaign = app.locals.campaigns[campaignId];
    if (!campaign) {
      logger.error(`app.locals.campaigns[${campaignId}] undefined`);

      return res.sendStatus(500);
    }
  }

  // TODO: Check to see if our campaign has a custom campaignBot set.
  // If not, use our default CAMPAIGNBOT_ID for rendering response messages.
  const campaignBotId = process.env.CAMPAIGNBOT_ID;
  const controller = app.locals.controllers.campaignBots[campaignBotId];
  if (!controller) {
    logger.error(`app.locals.controllers.campaignBots[${campaignBotId}] undefined`);

    return res.sendStatus(500);
  }

  return controller
    .loadUser(req.user_id)
    .then(user => {
      controller.debug(req, `loaded user:${user._id}`);

      req.user = user; // eslint-disable-line no-param-reassign

      if (!campaign) {
        campaignId = user.current_campaign;
        controller.debug(req, `set campaignId:${campaignId}`);

        if (!campaignId) {
          // TODO: Send to non-existent start menu to select a campaign.
          logger.error(`user:${req.user_id} current_campaign undefined`);
        }

        campaign = app.locals.campaigns[campaignId];

        // TODO: Edge-case where the user's saved campaign has been closed since signup created

        if (!campaign) {
          // TODO: Same - send to start menu to select campaign if not found for campaignId.
          logger.error(`app.locals.campaigns[${campaignId}] undefined`);
        }
      }
      req.campaign_id = campaignId; // eslint-disable-line no-param-reassign
      req.campaign = campaign; // eslint-disable-line no-param-reassign

      if (controller.isCommand(req, 'clear_cache')) {
        req.user.campaigns = {}; // eslint-disable-line no-param-reassign
        logger.info(`${controller.loggerPrefix(req)} cleared user.campaigns`);

        return controller.getCurrentSignup(req);
      }

      const signupId = user.campaigns[req.campaign_id];

      if (signupId) {
        return controller.loadCurrentSignup(req, signupId);
      }

      return controller.getCurrentSignup(req);
    })
    .then(signup => {
      controller.debug(req, `loaded signup:${signup._id.toString()}`);
      req.signup = signup; // eslint-disable-line no-param-reassign

      if (!signup) {
        // TODO: Handle this edge-case.
        logger.error('signup undefined');
      }

      if (controller.isCommand(req, 'member_support')) {
        return controller.renderResponseMessage(req, 'member_support');
      }

      if (signup.draft_reportback_submission) {
        return controller.continueReportbackSubmission(req);
      }

      if (controller.isCommand(req, 'reportback')) {
        return controller.createReportbackSubmission(req);
      }

      if (signup.total_quantity_submitted) {
        return controller.renderResponseMessage(req, 'menu_completed');
      }

      return controller.renderResponseMessage(req, 'menu_signedup');
    })
    .then(msg => {
      controller.debug(req, `sendMessage:${msg}`);
      controller.setCurrentCampaign(req.user, req.campaign_id);

      if (controller.isCommand(req, 'member_support')) {
        mobilecommonsOip = process.env.MOBILECOMMONS_OIP_AGENTVIEW || 217171;
      }

      mobilecommons.chatbot(req.body, mobilecommonsOip, msg);

      return res.send({ message: msg });
    })
    .catch(err => {
      controller.error(req, res, err);
      return res.sendStatus(500);
    });
});

module.exports = router;
