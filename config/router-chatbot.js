'use strict';

/**
 * Imports.
 */
const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const mobilecommons = rootRequire('lib/mobilecommons');
const logger = app.locals.logger;
const Promise = require('bluebird');

function CampaignClosedError() {}
CampaignClosedError.prototype = Object.create(Error.prototype);

function CampaignNotFoundError() {}
CampaignNotFoundError.prototype = Object.create(Error.prototype);


/**
 * Formats our Express return response.
 * @param {string} msg - Chatbot message responding back to user
 */
function gambitResponse(msg) {
  return { message: msg };
}

/**
 * Send SMS with given msg back to our incoming Mobile Commons user by updating their MC Profile.
 * @param {object} req - Incoming Express request, with loaded req.user model
 * @param {string} msg - Chatbot message responding back to user
 */
function postMobileCommonsProfile(req, msg) {
  if (process.env.MOBILECOMMONS_DISABLED) {
    logger.warn('MOBILECOMMONS_DISABLED');

    return;
  }

  let mobileCommonsOIP = process.env.MOBILECOMMONS_OIP_CHATBOT;
  if (req.cmd_member_support) {
    mobileCommonsOIP = process.env.MOBILECOMMONS_OIP_AGENTVIEW;
  }

  const data = {
    // Target Mobile Commons OIP must render gambit_chatbot_response in Liquid to deliver the msg.
    // @see https://github.com/DoSomething/gambit/wiki/Chatbot#mobile-commons
    gambit_chatbot_response: msg,
  };
  // If no Northstar ID is currently saved on user's Mobile Commons profile:
  if (!req.body.profile_northstar_id) {
    // Save it to avoid future Northstar GET users requests in subsequent incoming chatbot requests.
    data.northstar_id = req.user._id;
  }

  mobilecommons.profile_update(req.user.mobile, mobileCommonsOIP, data);
}

/**
 * Handle chatbot conversations.
 */
router.post('/', (req, res) => {
  const scope = req;
  const controller = app.locals.controllers.campaignBot;

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

  let currentSignup;

  /**
   * Check for external Signup from incoming Quicksilver request.
   */
  if (req.body.signup_id) {
    const signupID = req.body.signup_id;
    const source = req.body.signup_source;
    logger.debug(`chatbot signup:${signupID} source:${source}`);

    if (req.body.signup_source === process.env.DS_API_POST_SOURCE) {
      return res.send(`Already sent confirmation for signup ${signupID} source:${source}.`);
    }

    return app.locals.db.signups
      .lookupByID(signupID)
      .then((signup) => {
        currentSignup = signup;
        // TODO: Check if currentSignup.campaign is defined in CAMPAIGNBOT_CAMPAIGNS.
        // If it's not, send Express response to alert, and exit.

        return app.locals.db.users.lookup('id', currentSignup.user);
      })
      .then((user) => {
        if (!user) {
          return res.status(500).send({ error: 'Cannot find user for signup' });
        }

        return user.setCurrentCampaign(currentSignup);
      })
      .then((user) => {
        scope.user = user;
        scope.signup = currentSignup;
        scope.campaign = app.locals.campaigns[currentSignup.campaign];

        const msg = controller.renderResponseMessage(scope, 'menu_signedup_external');
        postMobileCommonsProfile(scope, msg);

        return res.send(gambitResponse(msg));
      });
  }

  /**
   * Load current User from incoming Mobile Commons request.
   */
  if (!req.body.profile_northstar_id && !req.body.phone) {
    return res.status(422).send({ error: 'profile_northstar_id or phone is required.' });
  }

  // TODO: Add reject, and throw new custom errors to indicate various error types.
  const loadUser = new Promise((resolve) => {
    logger.log('loadUser');

    if (req.body.profile_northstar_id) {
      const userID = req.body.profile_northstar_id;
      return app.locals.db.users
        .findById(userID)
        .exec()
        .then(user => {
          if (!user) {
            logger.debug(`no doc for user:${userID}`);

            return resolve(app.locals.db.users.lookup('id', userID));
          }
          logger.debug(`found doc for user:${userID}`);

          return resolve(user);
        });
    }

    return app.locals.db.users
      .lookup('mobile', req.body.phone)
      .then(user => resolve(user))
      .catch(() => {
        logger.debug(`app.locals.db.users.lookup could not find mobile:${req.body.phone}`);

        return resolve(app.locals.db.users.createForMobileCommonsRequest(req));
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
      postMobileCommonsProfile(scope, msg);

      return res.send(gambitResponse(msg));
    })
    .catch(CampaignNotFoundError, () => {
      logger.error('CampaignNotFoundError');

      return res.sendStatus(404);
    })
    .catch(CampaignClosedError, () => {
      logger.error('CampaignClosedError');
      const msg = controller.renderResponseMessage(scope, 'campaign_closed');
      postMobileCommonsProfile(scope, msg);

      return res.send(gambitResponse(msg));
    })
    .catch(err => {
      controller.error(req, scope, err);

      return res.sendStatus(500);
    });
});

module.exports = router;
