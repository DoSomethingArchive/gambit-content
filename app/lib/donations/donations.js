/**
 * Handles donation routes for ScienceSleuth DonorsChoose donations.
 */

var express = require('express')
  , router = express.Router();

var DonorsChoose = require('./controllers/DonorsChooseDonationController');

router.post('/:controller/chat', function(request, response) {
  var controller = new DonorsChoose();
  if (controller) {
    controller.chat(request, response);
  }
  else {
    response.status(404).send('Request not available for: ' + request.params.controller);
  }
});

module.exports = router;
