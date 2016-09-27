var express = require('express')
var router = express.Router();

var logger = rootRequire('lib/logger');
const mobilecommons = rootRequire('lib/mobilecommons');

var campaignRouter = require('./legacy/ds-routing');
var reportbackRouter = require('./legacy/reportback');
var CampaignBot = require('./controllers/CampaignBotController');
var DonorsChooseBot = require('./controllers/DonorsChooseBotController');
var Slothbot = require('./controllers/SlothBotController');
var gambitJunior = rootRequire('lib/gambit-junior');

app.use('/', router);

router.get('/', function (req, res) {
  res.send('hi');
});

router.use(function(req, res, next) {
  var apiKey = process.env.GAMBIT_API_KEY;
  if (req.method === 'POST' && req.headers['x-gambit-api-key'] !== apiKey) {
    logger.warn('router invalid x-gambit-api-key:', req.url);
    return res.sendStatus(403);
  }
  next();
});

router.use('/ds-routing', campaignRouter);

router.use('/reportback', reportbackRouter);

router.post('/v1/chatbot', function(request, response) {

  // Store relevant info from incoming Mobile Commons requests.
  request.incoming_message = request.body.args;
  request.incoming_image_url = request.body.mms_image_url;
  // @todo Handle when Northstar ID doesn't exist
  request.user_id = request.body.profile_northstar_id;
  request.user_mobile = request.body.phone;

  var controller;

  switch (request.query.bot_type) {
    case 'campaignbot':
      request.campaign_id = request.query.campaign;
      return campaignBot(request, response);

    // @todo Remove this safety check, deprecating donorschoose bot_type value.
    // Using donorschoosebot instead.
    case 'donorschoose':
      controller = new DonorsChooseBot();
      break;
    case 'donorschoosebot':
      controller = new DonorsChooseBot();
      break;
    default:
      controller = new Slothbot();
  }

  controller.chatbot(request, response);

});

router.post('/v1/chatbot/sync', function(request, response) {

  gambitJunior.syncBotConfigs(request, response, request.query.bot_type);

});

/**
 * Routing for the CampaignBot.
 */
function campaignBot(req, res) {
  req.campaign_id = req.query.campaign;
  const controller = new CampaignBot(req, res);

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

  return controller
    .loadUser(req.user_id)
    .then(user => {
      controller.debug(req, `loaded user:${user._id}`);

      req.user = user;
      const currentSignup = user.campaigns[req.campaign_id];
      if (currentSignup) {
        return controller.loadSignup(currentSignup);
      }

      return controller.getCurrentSignup(user, req.campaign_id);
    })
    .then(signup => {
      controller.debug(req, `loaded signup:${signup._id}`);
      req.signup = signup;

      if (signup.draft_reportback_submission) {
        return controller.continueReportbackSubmission(req);
      }

      if (controller.isCommandReportback(req.incoming_message)) {
        return controller.createReportbackSubmission(req);
      }

      if (signup.total_quantity_submitted) {
        return controller.getMessage(req, controller.bot.msg_menu_completed);
      }

      return controller.getMessage(req, controller.bot.msg_menu_signedup);
    })
    .then(msg => {
      mobilecommons.chatbot(req.body, req.mobilecommons_config.oip_chat, msg);

      return res.send({message: msg});  
    })
    .catch(err => {
      controller.error(req, res, err);
    });
}
