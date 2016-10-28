'use strict';

/**
 * Imports.
 */
const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap

const logger = app.locals.logger;
const Promise = require('bluebird');
const CampaignClosedError = require('../exceptions/CampaignClosedError');
const CampaignNotFoundError = require('../exceptions/CampaignNotFoundError');

/**
 * Formats our Express return response.
 * @param {string} msg - Chatbot message responding back to user
 */
function gambitResponse(msg) {
  return { message: msg };
}

router.post('/', (req, res) => {
  const controller = app.locals.controllers.campaignBot;
  const scope = req;
  scope.oip = process.env.MOBILECOMMONS_OIP_CHATBOT;
  scope.incoming_message = req.body.args;
  scope.incoming_image_url = req.body.mms_image_url;
  let incomingLog = `msg:${scope.incoming_message} img:${scope.incoming_image_url}`;

  if (req.body.keyword) {
    scope.keyword = req.body.keyword.toLowerCase();
    incomingLog = `${incomingLog} keyword:${scope.keyword}`;
  }

  logger.debug(incomingLog);

  const botType = req.query.bot_type;
  if (botType === 'donorschoose' || botType === 'donorschoosebot') {
    return app.locals.controllers.donorsChooseBot.chatbot(req, res);
  }

  let configured = true;
  // Check for required config variables.
  const settings = [
    'GAMBIT_CMD_MEMBER_SUPPORT',
    'GAMBIT_CMD_REPORTBACK',
    'MOBILECOMMONS_OIP_AGENTVIEW',
    'MOBILECOMMONS_OIP_CHATBOT',
  ];
  settings.forEach((configVar) => {
    if (!process.env[configVar]) {
      logger.error(`undefined process.env.${configVar}`);
      configured = false;
    }
  });

  if (!configured) {
    return res.sendStatus(500);
  }

  if (!req.body.phone) {
    return res.status(422).send({ error: 'phone is required.' });
  }

  let mobileCommonsOIP = process.env.MOBILECOMMONS_OIP_CHATBOT;

  const loadUser = new Promise((resolve, reject) => {
    logger.log('loadUser');

    return app.locals.db.users
      .lookup('mobile', req.body.phone)
      .then(user => resolve(user))
      .catch((err) => {
        if (err && err.status === 404) {
          logger.debug(`app.locals.db.users.lookup could not find mobile:${req.body.phone}`);

          return resolve(app.locals.db.users.createForMobileCommonsRequest(req));
        }
        return reject(err);
      });
  });

  const loadSignup = new Promise((resolve, reject) => {
    logger.log('loadSignup');

    return loadUser.then((user) => {
      logger.debug(`loaded user:${user._id}`);
      scope.user = user;

      let campaign;
      let campaignID;

      if (scope.keyword) {
        // Find the Campaign associated with keyword.
        campaignID = app.locals.keywords[scope.keyword];
        campaign = app.locals.campaigns[campaignID];

        if (!campaign) {
          logger.error(`keyword app.locals.campaigns[${campaignID}] undefined`);
          throw new CampaignNotFoundError();
        }

        if (campaign.status === 'closed') {
          // Store campaign to render in closed message.
          scope.campaign = campaign;
          // TODO: Fire custom newrelic/stathat event? keyword needs to be removed in Mobile Commons
          // or assigned to a different active CampaignBot Campaign.
          logger.error(`keyword:${scope.keyword} is set to closed campaign:${campaignID}`);
          throw new CampaignClosedError();
        }

        return campaign;
      }

      // Load user's current campaign (set from our last response).
      campaignID = user.current_campaign;
      campaign = app.locals.campaigns[campaignID];
      logger.debug(`user.current_campaign:${campaignID}`);

      if (!campaign) {
        // TODO: Send to non-existent start menu to select a campaign.
        logger.error(`user:${user._id} current_campaign ${campaignID} undefined`);
        throw new CampaignNotFoundError();
      }

      return campaign;
    })
    .then((campaign) => {
      logger.debug(`loaded campaign:${campaign._id}`);
      scope.campaign = campaign;

      if (controller.isCommand(req, 'clear_cache')) {
        scope.user.campaigns = {};
        logger.info(`${controller.loggerPrefix(scope)} cleared user.campaigns`);

        return controller.getCurrentSignup(scope);
      }

      const signupID = scope.user.campaigns[campaign._id];
      if (signupID) {
        return controller.loadCurrentSignup(scope, signupID);
      }

      return controller.getCurrentSignup(scope);
    })
    .then(signup => resolve(signup))
    .catch(err => reject(err));
  });

  return loadSignup
    .then((signup) => {
      controller.debug(scope, `loaded signup:${signup._id.toString()}`);
      scope.signup = signup;

      if (!scope.signup) {
        // TODO: Handle this edge-case.
        logger.error('signup undefined');
        return false;
      }

      if (controller.isCommand(scope, 'member_support')) {
        scope.cmd_member_support = true;
        mobileCommonsOIP = process.env.MOBILECOMMONS_OIP_AGENTVIEW;
        return controller.renderResponseMessage(scope, 'member_support');
      }

      if (scope.signup.draft_reportback_submission) {
        return controller.continueReportbackSubmission(scope);
      }

      if (controller.isCommand(scope, 'reportback')) {
        return controller.createReportbackSubmission(scope);
      }

      if (scope.signup.total_quantity_submitted) {
        if (scope.keyword) {
          return controller.renderResponseMessage(scope, 'menu_completed');
        }
        // If we're this far, member didn't text back Reportback or Member Support commands.
        return controller.renderResponseMessage(scope, 'invalid_cmd_completed');
      }

      if (scope.keyword) {
        return controller.renderResponseMessage(scope, 'menu_signedup_gambit');
      }

      return controller.renderResponseMessage(scope, 'invalid_cmd_signedup');
    })
    .then((msg) => {
      controller.debug(scope, `sendMessage:${msg}`);
      scope.user.setCurrentCampaign(scope.signup);
      scope.user.postMobileCommonsProfileUpdate(mobileCommonsOIP, msg);

      return res.send(gambitResponse(msg));
    })
    .catch(CampaignNotFoundError, () => {
      logger.error('CampaignNotFoundError');

      return res.sendStatus(404);
    })
    .catch(CampaignClosedError, () => {
      logger.error('CampaignClosedError');
      const msg = controller.renderResponseMessage(scope, 'campaign_closed');
      scope.user.postMobileCommonsProfileUpdate(mobileCommonsOIP, msg);

      return res.send(gambitResponse(msg));
    })
    .catch(err => {
      logger.error(err);
      controller.error(req, scope, err);

      return res.sendStatus(500);
    });
});

module.exports = router;
