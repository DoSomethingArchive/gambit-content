var Babysitter = require('./controllers/Babysitter')
  , MCRouting = require('./controllers/MCRouting')
  , Tips = require('./controllers/Tips')
  , SGCollaborativeStoryController = require('./controllers/SGCollaborativeStoryController')
  , SGCompetitiveStoryController = require('./controllers/SGCompetitiveStoryController')
  , SGMostLikelyToController = require('./controllers/SGMostLikelyToController')
  ;

module.exports = function(app) {

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

  /**
   * Gets a game controller.
   *
   * @param String gameType
   *
   * @return Instance of the appropriate game controller for the game type
   */
  function getGameController(gameType) {
    if (gameType === 'collaborative-story') {
      return new SGCollaborativeStoryController(app);
    }
    else if (gameType === 'competitive-story') {
      return new SGCompetitiveStoryController(app);
    }
    else if (gameType === 'most-likely-to') {
      return new SGMostLikelyToController(app);
    }

    return null;
  }

  /**
   * Create a team SMS game.
   */
  app.post('/game/create', function(request, response) {
    var gameController = getGameController(request.body.type);
    if (gameController == null) {
      response.send(406, 'Invalid type parameter.');
    }
    else {
      gameController.createGame(request, response);
    }
  });

  /**
   * Beta accepts the invite to a game request.
   */
  app.post('/game/beta-join', function(request, response) {
    var gameController = getGameController(request.body.type);
    if (gameController == null) {
      response.send(406, 'Invalid type parameter.');
    }
    else {
      gameController.betaJoinGame(request, response);
    }
  });

  /**
   * @todo
   */
  app.post('/game/alpha-start', function(request, response) {
    var gameController = getGameController(request.body.type);
    if (gameController == null) {
      response.send(406, 'Invalid type parameter.');
    }
    else {
      gameController.alphaStartGame(request, response);
    }
  });
}
