var express = require('express')
var router = express.Router();

var logger = rootRequire('lib/logger');
var campaignRouter = require('./legacy/ds-routing');
var reportbackRouter = require('./legacy/reportback');
var CampaignBot = require('./controllers/CampaignBotController');
var DonorsChooseBot = require('./controllers/DonorsChooseBotController');
var Slothbot = require('./controllers/SlothBotController');

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
  request.user_id = request.body.phone;

  var controller;

  switch (request.query.bot_type) {
    case 'campaign':
      controller = new CampaignBot(request.query.campaign);
      break;
    case 'donorschoose':
      controller = new DonorsChooseBot();
      break;
    default:
      controller = new Slothbot();
  }

  controller.chatbot(request, response);

});

router.post('/v1/chatbot/sync', function(request, response) {

  var controller = new DonorsChooseBot();
  controller.syncBotConfigs(request, response);

});
