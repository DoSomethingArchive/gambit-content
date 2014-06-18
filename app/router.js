var babysitter_api = require('../pregnancytext/babysitter-api')
, ds_routing_api = require('../lib/ds/ds-routing-api')
, tips_api = require('../lib/ds/tips-api');

module.exports = function(app) {
  /**
   * Pregnancy Text 2014
   */
  app.post('/pregnancy-text/send-babysitter-invite-alpha', function(req, res) {
    babysitter_api.onSendBabysitterInvite(req, res, babysitter_api.optinParentOnInviteAlpha,
      babysitter_api.campaignIdParentNoBsAlpha);
  });

  app.post('/pregnancy-text/send-babysitter-invite-beta', function(req, res) {
    babysitter_api.onSendBabysitterInvite(req, res, babysitter_api.optinParentOnInviteBeta,
      babysitter_api.campaignIdParentNoBsBeta);
  });

  // For players who accidentally opt-out, we give them the option to get back into
  // the game through an opt-in in a different campaign that continues the drip
  // messages on the same day. For babysitter invites sent from this campaign,
  // we'll push the players to the Beta w/ Babysitter campaign.
  app.post('/pregnancy-text/send-babysitter-invite-resurrected', function(req, res) {
    babysitter_api.onSendBabysitterInvite(req, res, babysitter_api.optinParentOnInviteBeta,
      babysitter_api.campaignIdParentNoBsResurrected);
  });

  /**
   * Route user to appropriate opt-in path based on their answer to a Y/N question.
   */
  app.get('/ds-routing/yes-no-gateway', ds_routing_api.yesNoGateway);

  /**
   * Transition users for the sign up campaign to the actual campaign.
   */
  app.post('/ds-routing/start-campaign-gate', ds_routing_api.startCampaignGate);

  /**
   * Once in the actual campaign, the first message a user gets is a welcome
   * message with the KNOW, PLAN, DO, and PROVE options. People can text 1-4 to
   * select what they want to do. This handles that.
   */
  app.post('/ds/handle-start-campaign-response', ds_routing_api.handleStartCampaignResponse);

  /**
   * Retrieve in-order tips.
   */
  app.post('/ds/tips', tips_api.deliverTips);

}
