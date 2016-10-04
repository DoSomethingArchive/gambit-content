'use strict';

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
    const msgTxt = app.locals.slothBot.renderResponseMessage(req);
    mobilecommons.chatbot(req.body, slothbotOptinPath, msgTxt);

    return res.send({ message: msgTxt });
  }

  if (botType === 'donorschoose' || botType === 'donorschoosebot') {
    return app.locals.donorsChooseBot.chatbot(req, res);
  }

  const controller = app.locals.campaignBot;
  if (!controller.bot) {
    logger.error('CampaignBotController.bot undefined');

    return res.sendStatus(500);
  }

  const mobilecommonsOip = process.env.CAMPAIGNBOT_MOBILECOMMONS_OIP;
  if (!mobilecommonsOip) {
    logger.error('CAMPAIGNBOT_MOBILECOMMONS_OIP undefined');

    return res.sendStatus(500);
  }

  let campaignId = req.query.campaign;
  let campaign;
  if (campaignId) {
    campaign = app.locals.configs.campaigns[campaignId];
    if (!campaign) {
      logger.error(`app.locals.configs.campaigns[${campaignId}] undefined`);

      return res.sendStatus(500);
    }
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

        campaign = app.locals.configs.campaigns[campaignId];
        if (!campaign) {
          // TODO: Same - send to start menu to select campaign if not found for campaignId.
          logger.error(`app.locals.configs.campaigns[${campaignId}] undefined`);
        }
      }
      req.campaign_id = campaignId; // eslint-disable-line no-param-reassign
      req.campaign = campaign; // eslint-disable-line no-param-reassign

      if (controller.isCommandClearCache(req)) {
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

      if (signup.draft_reportback_submission) {
        return controller.continueReportbackSubmission(req);
      }

      if (controller.isCommandReportback(req)) {
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

      mobilecommons.chatbot(req.body, mobilecommonsOip, msg);

      return res.send({ message: msg });
    })
    .catch(err => {
      controller.error(req, res, err);
      return res.sendStatus(500);
    });
});

/**
 * Sync chatbot configs
 */
router.post('/sync', (req, res) => {
  const gambitJunior = rootRequire('lib/gambit-junior');

  // TODO: Handle response here, not in gambitJunior.
  gambitJunior.syncBotConfigs(req, res, req.query.bot_type);
});


module.exports = router;

