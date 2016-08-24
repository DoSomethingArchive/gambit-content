/**
 * Handles donation routes for ScienceSleuth DonorsChoose donations.
 */

var express = require('express')
  , router = express.Router();

var DonorsChoose = require('./controllers/DonorsChooseBotController');

router.post('/', function(request, response) {
  var controller = new DonorsChoose();
  if (controller) {
    controller.chatbot(request, response);
  }
  else {
    response.status(404).send('Request not available for: ' + request.params.controller);
  }
});

router.post('/sync', function(request, response) {
  var controller = new DonorsChoose();
  if (controller) {
    controller.syncBotConfigs(request, response);
  }
  else {
    response.status(404).send('Request not available for: ' + request.params.controller);
  }
});

module.exports = router;
