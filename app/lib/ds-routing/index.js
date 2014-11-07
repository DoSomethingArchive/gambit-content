/**
 * DS custom routing to Mobile Commons opt-in paths.
 */
var MCRouting = require('./controllers/MCRouting')
  , Tips = require('./controllers/Tips')
  ;

module.exports = function(app) {
  var mcRouting = new MCRouting(app);
  var tips = new Tips(app);

  /**
   * Route user to appropriate opt-in path based on their answer to a Y/N question.
   */
  app.post('/ds-routing/yes-no-gateway', function(req, res) {
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
};
