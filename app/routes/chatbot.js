'use strict';

/**
 * Imports.
 */
const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap

const logger = app.locals.logger;
const Promise = require('bluebird');
const helpers = require('../../lib/helpers');
const NotFoundError = require('../exceptions/NotFoundError');
const UnprocessibleEntityError = require('../exceptions/UnprocessibleEntityError');

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

  const loadUser = new Promise((resolve, reject) => {
    logger.log('loadUser');

    return app.locals.db.users
      .lookup('mobile', req.body.phone)
      .then(user => resolve(user))
      .catch((err) => {
        if (err && err.status === 404) {
          logger.debug(`app.locals.db.users.lookup could not find mobile:${req.body.phone}`);

          const user = app.locals.db.users.post({
            mobile: req.body.phone,
            mobilecommons_id: req.profile_id,
          });
          return resolve(user);
        }
        return reject(err);
      });
  });

  const loadCampaign = new Promise((resolve, reject) => {
    logger.log('loadCampaign');

    return loadUser
      .then((user) => {
        logger.debug(`loaded user:${user._id}`);
        scope.user = user;

        let campaign;
        let campaignId;

        if (req.query.broadcast) {
          campaignId = process.env.CAMPAIGNBOT_BROADCAST_CAMPAIGN;
          campaign = app.locals.campaigns[campaignId];

          if (!campaign) {
            const msg = `Broadcast Campaign '${campaignId}' not found.`;
            throw new NotFoundError(msg);
          }

          // TODO: Add check on app start to trigger alert if Broadcast Campaign is closed.
          if (campaign.status === 'closed') {
            // TODO: Include this message to the CampaignClosedError.
            const msg = `Broadcast Campaign ${campaignId} is closed.`;
            throw new UnprocessibleEntityError(msg);
          }

          return resolve(campaign);
        }

        if (scope.keyword) {
          logger.debug(`load campaign for keyword:${scope.keyword}`);
          campaignId = app.locals.keywords[scope.keyword];
          campaign = app.locals.campaigns[campaignId];

          if (!campaign) {
            const msg = `Campaign not found for keyword '${scope.keyword}'.`;
            throw new NotFoundError(msg);
          }

          if (campaign.status === 'closed') {
            // Store campaign to render in closed message.
            scope.campaign = campaign;
            // TODO: Include this message to the CampaignClosedError.
            const msg = `Keyword received for closed campaign ${campaignId}.`;
            throw new UnprocessibleEntityError(msg);
          }

          return resolve(campaign);
        }

        campaignId = user.current_campaign;
        campaign = app.locals.campaigns[campaignId];
        logger.debug(`user.current_campaign:${campaignId}`);

        if (!campaign) {
          // TODO: Send to non-existent start menu to select a campaign.
          const msg = `User ${user._id} current_campaign ${campaignId} not found in CampaignBot.`;
          throw new NotFoundError(msg);
        }

        return resolve(campaign);
      })
      .catch((err) => {
        logger.error(err);

        return reject(err);
      });
  });

  const broadcastDeclined = req.query.broadcast && !helpers.isYesResponse(req.incoming_message);
  if (broadcastDeclined) {
    const msg = 'OK, no bigs.';

    return res.send(gambitResponse(msg));
  }

  const loadSignup = new Promise((resolve, reject) => {
    logger.log('loadSignup');

    return loadCampaign
      .then((campaign) => {
        logger.log(`loaded campaign:${campaign._id}`);
        scope.campaign = campaign;

        return app.locals.db.signups
          .lookupCurrent(scope.user, scope.campaign)
          .then((currentSignup) => {
            if (currentSignup) {
              logger.debug(`loadSignup found signup:${currentSignup._id}`);

              return resolve(currentSignup);
            }

            logger.debug('loadSignup not find signup');
            const newSignup = app.locals.db.signups.post(scope.user, scope.campaign, scope.keyword);

            return resolve(newSignup);
          });
      })
      .catch((err) => {
        logger.error(err);

        return reject(err);
      });
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
        scope.oip = process.env.MOBILECOMMONS_OIP_AGENTVIEW;
        return controller.renderResponseMessage(scope, 'member_support');
      }

      if (scope.signup.draft_reportback_submission) {
        logger.debug(`draft_reportback_submission:${scope.signup.draft_reportback_submission._id}`);
        return controller.continueReportbackSubmission(scope);
      }

      if (controller.isCommand(scope, 'reportback')) {
        return controller.createReportbackSubmission(scope);
      }

      if (scope.signup.reportback) {
        if (scope.keyword || req.query.broadcast) {
          return controller.renderResponseMessage(scope, 'menu_completed');
        }
        // If we're this far, member didn't text back Reportback or Member Support commands.
        return controller.renderResponseMessage(scope, 'invalid_cmd_completed');
      }

      if (scope.keyword || req.query.broadcast) {
        return controller.renderResponseMessage(scope, 'menu_signedup_gambit');
      }

      return controller.renderResponseMessage(scope, 'invalid_cmd_signedup');
    })
    .then((msg) => {
      scope.response_message = msg;
      controller.debug(scope, `chatbotResponseMessage:${msg}`);
      // Save to continue conversation with future mData requests that don't contain a keyword.
      scope.user.current_campaign = scope.campaign._id;
      return scope.user.save();
    })
    .then(() => {
      logger.debug(`saved user.current_campaign:${scope.campaign._id}`);
      scope.user.postMobileCommonsProfileUpdate(scope.oip, scope.response_message);

      return res.send(gambitResponse(scope.response_message));
    })
    .catch(NotFoundError, (err) => {
      logger.error(err.message);

      return res.status(404).send(err.message);
    })
    .catch(UnprocessibleEntityError, (err) => {
      logger.error(err.message);
      // TODO: Send StatHat report to inform staff CampaignBot is running a closed Campaign.
      // We don't want to send an error back as response, but instead deliver success to Mobile
      // Commons and deliver the Campaign Closed message back to our User.
      const msg = controller.renderResponseMessage(scope, 'campaign_closed');
      scope.user.postMobileCommonsProfileUpdate(scope.oip, msg);

      return res.send(gambitResponse(msg));
    })
    .catch(err => {
      logger.error(err.message);

      return res.sendStatus(500);
    });
});

module.exports = router;
