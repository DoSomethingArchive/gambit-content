'use strict';

/**
 * Imports.
 */
const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const mobilecommons = rootRequire('lib/mobilecommons');
const logger = app.locals.logger;

/**
 * Formats our Express return response.
 * @param {string} msg - Chatbot message responding back to user
 */
function gambitResponse(msg) {
  return { message: msg };
}

/**
 * Sends SMS response back to the incoming Mobile Commons request.
 * @param {object} req - Incoming Express request, with loaded req.user model
 * @param {string} msg - Chatbot message responding back to user
 */
function sendSmsResponse(req, msg) {
  if (process.env.MOBILECOMMONS_DISABLED) {
    logger.warn('MOBILECOMMONS_DISABLED');

    return;
  }

  let mobilecommonsOIP = process.env.MOBILECOMMONS_OIP_CHATBOT;
  if (req.cmd_member_support) {
    mobilecommonsOIP = process.env.MOBILECOMMONS_OIP_AGENTVIEW;
  }
  logger.debug(`sendSmsResponse OIP:${mobilecommonsOIP}`);

  // The Mobile Commons OIP we post to below needs to render our user's gambit_chatbot_response
  // Custom Field in their Mobile Commons Profile, which we update via profile_update POST below.
  // @see https://github.com/DoSomething/gambit/wiki/Chatbot#mobile-commons
  const data = {
    gambit_chatbot_response: msg,
    // Store current campaign ID to support Mobile Commons filtering by members' current Campaign.
    gambit_current_campaign: req.campaign._id,
  };

  // If no Northstar ID is currently saved on user's Mobile Commons profile:
  if (!req.body.profile_northstar_id) {
    // Save it to avoid future Northstar GET users requests in subsequent incoming Gambit requests.
    data.northstar_id = req.user._id;
  }

  // Store User's Signup status for current campaign on Mobile Commons profile:
  const statusField = `campaign_${req.campaign._id}_status`;
  const statusValue = req.body[`profile_${statusField}`];
  logger.debug(`req.profile_${statusField}:${statusValue}`);

  const SIGNUP_STATUS_DOING = 'signedup';
  const SIGNUP_STATUS_COMPLETED = 'completed';

  if (statusValue !== SIGNUP_STATUS_COMPLETED) {
    if (req.signup.reportback) {
      data[statusField] = SIGNUP_STATUS_COMPLETED;
    } else {
      data[statusField] = SIGNUP_STATUS_DOING;
    }
  }

  mobilecommons.profile_update(req.user.mobile, mobilecommonsOIP, data);
}

/**
 * Handle chatbot conversations.
 */
router.post('/', (req, res) => {
  const scope = req;

  scope.incoming_message = req.body.args;
  scope.incoming_image_url = req.body.mms_image_url;

  logger.debug(`msg:${scope.incoming_message} img:${scope.incoming_image_url}`);

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

  let campaignID;

  if (req.body.keyword) {
    scope.keyword = req.body.keyword.toLowerCase();
    logger.debug(`keyword:${scope.keyword}`);

    campaignID = app.locals.keywords[req.keyword];
    scope.campaign = app.locals.campaigns[campaignID];
    if (!scope.campaign) {
      logger.error(`app.locals.campaigns[${campaignID}] undefined`);

      return res.sendStatus(500);
    }
  }

  const controller = app.locals.controllers.campaignBot;
  if (!controller) {
    logger.error('app.locals.controllers.campaignBot undefined');

    return res.sendStatus(500);
  }

  return controller
    .loadUser(req)
    .then(user => {
      logger.debug(`loaded user:${user._id}`);

      scope.user = user;

      // If we haven't loaded a campaign from an incoming keyword yet:
      if (!scope.campaign) {
        // Load user's current campaign (set from our last response).
        campaignID = user.current_campaign;
        controller.debug(scope, `current_campaign:${campaignID}`);

        if (!campaignID) {
          // TODO: Send to non-existent start menu to select a campaign.
          logger.error(`user:${user._id} current_campaign undefined`);
        }

        scope.campaign = app.locals.campaigns[campaignID];
        if (!scope.campaign) {
          // TODO: Send to non-existent start menu to select campaign if saved campaign not found.
          logger.error(`app.locals.campaigns[${campaignID}] undefined`);
        }
      }

      if (controller.isCommand(req, 'clear_cache')) {
        scope.user.campaigns = {};
        logger.info(`${controller.loggerPrefix(scope)} cleared user.campaigns`);

        return controller.getCurrentSignup(scope);
      }

      // TODO: Sanity check. If we still haven't loaded scope.campaign here, push to the menu.

      const signupID = user.campaigns[campaignID];
      if (signupID) {
        return controller.loadCurrentSignup(scope, signupID);
      }

      return controller.getCurrentSignup(scope);
    })
    .then(signup => {
      controller.debug(scope, `loaded signup:${signup._id.toString()}`);
      scope.signup = signup;

      if (!scope.signup) {
        // TODO: Handle this edge-case.
        logger.error('signup undefined');
      }

      if (controller.isCommand(scope, 'member_support')) {
        scope.cmd_member_support = true;
        return controller.renderResponseMessage(scope, 'member_support');
      }

      if (scope.campaign.status === 'closed') {
        controller.debug(scope, 'campaign closed');

        return controller.renderResponseMessage(scope, 'campaign_closed');
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
        return controller.renderResponseMessage(scope, 'menu_signedup');
      }

      return controller.renderResponseMessage(scope, 'invalid_cmd_signedup');
    })
    .then(msg => {
      controller.debug(scope, `sendMessage:${msg}`);
      controller.setCurrentCampaign(scope.user, scope.campaign._id);
      sendSmsResponse(scope, msg);

      return res.send(gambitResponse(msg));
    })
    .catch(err => {
      controller.error(req, scope, err);

      return res.sendStatus(500);
    });
});

module.exports = router;
