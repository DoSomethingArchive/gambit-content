'use strict';

const express = require('express')
const router = express.Router();

const logger = rootRequire('lib/logger');
const mobilecommons = rootRequire('lib/mobilecommons');


app.use('/', router);

router.get('/', function (req, res) {
  res.send('hi');
});

/**
 * Authentication.
 */
router.use(function(req, res, next) {
  var apiKey = process.env.GAMBIT_API_KEY;
  if (req.method === 'POST' && req.headers['x-gambit-api-key'] !== apiKey) {
    logger.warn('router invalid x-gambit-api-key:', req.url);
    return res.sendStatus(403);
  }
  next();
});

/**
 * Legacy routes.
 */
const campaignRouter = require('./legacy/ds-routing');
const reportbackRouter = require('./legacy/reportback');

router.use('/ds-routing', campaignRouter);
router.use('/reportback', reportbackRouter);

/**
 * Chatbot.
 */
router.post('/v1/chatbot', function(req, res) {
  // TODO: Handle when Northstar ID doesn't exist
  req.user_id = req.body.profile_northstar_id;
  req.user_mobile = req.body.phone;
  req.incoming_message = req.body.args;
  req.incoming_image_url = req.body.mms_image_url;

  let botType = req.query.bot_type;

  if (botType === 'slothbot') {
    // TODO: Store as a config variable.
    const slothbotOptinPath = 210045;
    let msgTxt = app.locals.slothBot.renderResponseMessage(req);
    mobilecommons.chatbot(req.body, slothbotOptinPath, msgTxt);

    return res.send({message: msgTxt});  
  }
  if (botType === 'donorschoose' || botType === 'donorschoosebot') {
    const DonorsChooseBot = require('./controllers/DonorsChooseBotController');
    const donorsChooseBot = new DonorsChooseBot();

    return donorsChooseBot.chatbot(req, res);
  }

  return campaignBotRouter(req, res);
});

/**
 * Sync chatbot content from Gambit Jr. API.
 */
router.post('/v1/chatbot/sync', function(req, res) {
  const gambitJunior = rootRequire('lib/gambit-junior');

  gambitJunior.syncBotConfigs(req, res, req.query.bot_type);
});

/**
 * Routing for the CampaignBot.
 */
function campaignBotRouter(req, res) {
  req.campaign_id = req.query.campaign;
  const controller = app.locals.campaignBot;
  controller.debug(req, `msg:${req.incoming_message} img:${req.incoming_image_url}`);

  req.campaign = app.getConfig(
    app.ConfigName.CAMPAIGNS,
    req.campaign_id
  );

  req.mobilecommons_campaign = req.campaign.staging_mobilecommons_campaign;
  if (process.env.NODE_ENV === 'production') {
    req.mobilecommons_campaign = req.campaign.current_mobilecommons_campaign;
  }
  req.mobilecommons_config = app.getConfig(
    app.ConfigName.CHATBOT_MOBILECOMMONS_CAMPAIGNS,
    req.mobilecommons_campaign
  );

  let msgTxt;

  return controller
    .loadUser(req.user_id)
    .then(user => {
      controller.debug(req, `loaded user:${user._id}`);

      req.user = user;

      if (controller.isCommandClearCache(req)) {
        req.user.campaigns = {};
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
      req.signup = signup;

      if (signup.draft_reportback_submission) {
        return controller.continueReportbackSubmission(req);
      }

      if (controller.isCommandReportback(req)) {
        return controller.createReportbackSubmission(req);
      }

      if (signup.total_quantity_submitted) {
        msgTxt = controller.bot.msg_menu_completed;

        return controller.renderResponseMessage(req, msgTxt);
      }

      msgTxt = controller.bot.msg_menu_signedup;

      return controller.renderResponseMessage(req, msgTxt);
    })
    .then(msg => {
      controller.debug(req, `sendMessage:${msg}`);
      mobilecommons.chatbot(req.body, req.mobilecommons_config.oip_chat, msg);

      return res.send({message: msg});  
    })
    .catch(err => {
      controller.error(req, res, err);
      return res.sendStatus(500);
    });
}
