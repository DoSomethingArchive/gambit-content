/**
 * Routes used for PregnancyText 2014 to invite frineds to the Babysitter mini-game.
 */

var Babysitter = require('./BabysitterController')
  ;

module.exports = function(app) {

  var babysitter = new Babysitter(app);

  app.post('/pregnancy-text/send-babysitter-invite-alpha', function(req, res) {
    babysitter.onSendBabysitterInvite(req, res, babysitter.optinParentOnInviteAlpha,
      babysitter.campaignIdParentNoBsAlpha);
  });

  app.post('/pregnancy-text/send-babysitter-invite-beta', function(req, res) {
    babysitter.onSendBabysitterInvite(req, res, babysitter.optinParentOnInviteBeta,
      babysitter.campaignIdParentNoBsBeta);
  });

  /**
   * For players who accidentally opt-out, we give them the option to get back into
   * the game through an opt-in in a different campaign that continues the drip
   * messages on the same day. For babysitter invites sent from this campaign,
   * we'll push the players to the Beta w/ Babysitter campaign.
   */
  app.post('/pregnancy-text/send-babysitter-invite-resurrected', function(req, res) {
    babysitter.onSendBabysitterInvite(req, res, babysitter.optinParentOnInviteBeta,
      babysitter.campaignIdParentNoBsResurrected);
  });

};
