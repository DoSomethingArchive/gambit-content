/**
 * DS custom routing to Mobile Commons opt-in paths.
 */

var express = require('express')
  , router = express.Router();

var MCRouting = require('./controllers/MCRouting')
  , Tips = require('./controllers/Tips')
  ;

var mcRouting = new MCRouting;
var tips = new Tips;

/**
 * Route user to appropriate opt-in path based on their answer to a Y/N question.
 */
router.post('/yes-no-gateway', function(req, res) {
  mcRouting.yesNoGateway(req, res);
});

/**
 * Transition users for the sign up campaign to the actual campaign.
 */
router.post('/campaign-transition', function(req, res) {
  mcRouting.campaignTransition(req, res);
});

/**
 * Once in the actual campaign, the first message a user gets is a welcome
 * message with the KNOW, PLAN, DO, and PROVE options. People can text 1-4 to
 * select what they want to do. This handles that.
 */
router.post('/handle-start-campaign-response', function(req, res) {
  mcRouting.handleStartCampaignResponse(req, res);
});

/**
 * Retrieve in-order tips.
 */
router.post('/tips', function(req, res) {
  tips.deliverTips(req, res);
});

module.exports = router;