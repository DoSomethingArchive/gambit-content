module.exports = function(app) {

  var Babysitter = require('./controllers/Babysitter');
  var MCRouting = require('./controllers/MCRouting');
  var Tips = require('./controllers/Tips');

  var babysitter = new Babysitter(app);
  var mcRouting = new MCRouting(app);
  var tips = new Tips(app);

  /**
   * Pregnancy Text 2014
   */
  app.post('/pregnancy-text/send-babysitter-invite-alpha', function(req, res) {
    babysitter.onSendBabysitterInvite(req, res, babysitter.optinParentOnInviteAlpha,
      babysitter.campaignIdParentNoBsAlpha);
  });

  app.post('/pregnancy-text/send-babysitter-invite-beta', function(req, res) {
    babysitter.onSendBabysitterInvite(req, res, babysitter.optinParentOnInviteBeta,
      babysitter.campaignIdParentNoBsBeta);
  });

  // For players who accidentally opt-out, we give them the option to get back into
  // the game through an opt-in in a different campaign that continues the drip
  // messages on the same day. For babysitter invites sent from this campaign,
  // we'll push the players to the Beta w/ Babysitter campaign.
  app.post('/pregnancy-text/send-babysitter-invite-resurrected', function(req, res) {
    babysitter.onSendBabysitterInvite(req, res, babysitter.optinParentOnInviteBeta,
      babysitter.campaignIdParentNoBsResurrected);
  });

  /**
   * Route user to appropriate opt-in path based on their answer to a Y/N question.
   */
  app.get('/ds-routing/yes-no-gateway', function(req, res) {
    mcRouting.yesNoGateway(req, res);
  });

  /**
   * Transition users for the sign up campaign to the actual campaign.
   */
  app.post('/ds-routing/start-campaign-gate', function(req, res) {
    mcRouting.startCampaignGate(req, res);
  });

  /**
   * Once in the actual campaign, the first message a user gets is a welcome
   * message with the KNOW, PLAN, DO, and PROVE options. People can text 1-4 to
   * select what they want to do. This handles that.
   */
  app.post('/ds/handle-start-campaign-response', function(req, res) {
    mcRouting.handleStartCampaignResponse(req, res);
  });

  /**
   * Retrieve in-order tips.
   */
  app.post('/ds/tips', function(req, res) {
    tips.deliverTips(req, res);
  });

}
