
var express = require('express')
var router = express.Router();

var DonorsChooseBot = require('./controllers/DonorsChooseBotController');
var Slothbot = require('./controllers/SlothBotController');

router.post('/', function(request, response) {

  var controller;
  switch (request.query.bot_type) {
    case 'donorschoose':
      controller = new DonorsChooseBot();
      break;
    default:
      controller = new Slothbot();
  }

  controller.chatbot(request, response);

});

router.post('/sync', function(request, response) {

  var controller = new DonorsChooseBot();
  controller.syncBotConfigs(request, response);

});

module.exports = router;
