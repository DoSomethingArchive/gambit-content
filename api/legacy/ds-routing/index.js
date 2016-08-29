/**
 * DS custom routing to Mobile Commons opt-in paths.
 */

var express = require('express')
var router = express.Router();

var MCRouting = require('./controllers/MCRouting')
var mcRouting = new MCRouting;

/**
 * Route user to appropriate opt-in path based on their answer to a Y/N question.
 */
router.post('/yes-no-gateway', function(req, res) {
  mcRouting.yesNoGateway(req, res);
});

/**
 * Transitions user from a MoCo Signup-campaign into corresponding MoCo Campaign-campaign.
 */
router.post('/campaign-transition', function(req, res) {
  mcRouting.campaignTransition(req, res);
});

module.exports = router;
