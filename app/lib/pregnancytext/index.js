/**
 * Routes used for PregnancyText 2014 to invite frineds to the Babysitter mini-game.
 */

var express = require('express')
  , router = express.Router();

var Babysitter = require('./BabysitterController')
  ;

var babysitter = new Babysitter;

router.post('/send-babysitter-invite-alpha', function(req, res) {
  babysitter.onSendBabysitterInvite(req, res, babysitter.optinParentOnInviteAlpha,
    babysitter.campaignIdParentNoBsAlpha);
});

router.post('/send-babysitter-invite-beta', function(req, res) {
  babysitter.onSendBabysitterInvite(req, res, babysitter.optinParentOnInviteBeta,
    babysitter.campaignIdParentNoBsBeta);
});

/**
 * For players who accidentally opt-out, we give them the option to get back into
 * the game through an opt-in in a different campaign that continues the drip
 * messages on the same day. For babysitter invites sent from this campaign,
 * we'll push the players to the Beta w/ Babysitter campaign.
 */
router.post('/send-babysitter-invite-resurrected', function(req, res) {
  babysitter.onSendBabysitterInvite(req, res, babysitter.optinParentOnInviteBeta,
    babysitter.campaignIdParentNoBsResurrected);
});

module.exports = router;