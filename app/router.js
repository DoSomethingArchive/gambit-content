module.exports = function(app) {

  var babysitter_api = require('../pregnancytext/babysitter-api');
  var ds_routing_api = require('../lib/ds/ds-routing-api');
  var tips_api = require('../lib/ds/tips-api');

  var Babysitter = new babysitter_api(app);
  var DSRouting = new ds_routing_api(app);
  var Tips = new tips_api(app);

  /**
   * Pregnancy Text 2014
   */
  app.post('/pregnancy-text/send-babysitter-invite-alpha', function(req, res) {
    Babysitter.onSendBabysitterInvite(req, res, Babysitter.optinParentOnInviteAlpha,
      Babysitter.campaignIdParentNoBsAlpha);
  });

  app.post('/pregnancy-text/send-babysitter-invite-beta', function(req, res) {
    Babysitter.onSendBabysitterInvite(req, res, Babysitter.optinParentOnInviteBeta,
      Babysitter.campaignIdParentNoBsBeta);
  });

  // For players who accidentally opt-out, we give them the option to get back into
  // the game through an opt-in in a different campaign that continues the drip
  // messages on the same day. For babysitter invites sent from this campaign,
  // we'll push the players to the Beta w/ Babysitter campaign.
  app.post('/pregnancy-text/send-babysitter-invite-resurrected', function(req, res) {
    Babysitter.onSendBabysitterInvite(req, res, Babysitter.optinParentOnInviteBeta,
      Babysitter.campaignIdParentNoBsResurrected);
  });

  /**
   * Route user to appropriate opt-in path based on their answer to a Y/N question.
   */
  app.get('/ds-routing/yes-no-gateway', DSRouting.yesNoGateway);

  /**
   * Transition users for the sign up campaign to the actual campaign.
   */
  app.post('/ds-routing/start-campaign-gate', DSRouting.startCampaignGate);

  /**
   * Once in the actual campaign, the first message a user gets is a welcome
   * message with the KNOW, PLAN, DO, and PROVE options. People can text 1-4 to
   * select what they want to do. This handles that.
   */
  app.post('/ds/handle-start-campaign-response', DSRouting.handleStartCampaignResponse);

  /**
   * Retrieve in-order tips.
   */
  app.post('/ds/tips', Tips.deliverTips);

}
