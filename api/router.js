var express = require('express')
var router = express.Router();

var logger = rootRequire('lib/logger');
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
      controller = new CampaignBot(request.query.campaign);
      break;
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
