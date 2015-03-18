var emitter = rootRequire('app/eventEmitter')
  , logger = rootRequire('app/lib/logger')
  , connectionOperations = rootRequire('app/config/connectionOperations')
  , gameModel = rootRequire('app/lib/sms-games/models/sgCompetitiveStory')(connectionOperations)
  , message = require('./gameMessageHelpers')
  , SGSoloController = require('./SGSoloController')
  , start = require('./logicGameStart')
  , name = require('./playerNameHelpers')
  // After player attempts to join a started game, delay before she's opted into a solo game. 
  , BETA_TO_SOLO_AFTER_GAME_ALREADY_STARTED_DELAY = 3000
  ;

/**
 * Callback for when beta's game is found. Update persistent storage, send
 * game-pending messages if all players haven't joined yet, or auto-start the
 * game if all players are joined.
 */
module.exports = function(request, doc) {
  var joiningBetaPhone = request.body.phone;
  var gameConfig = app.getConfig(app.ConfigName.COMPETITIVE_STORIES, doc.story_id)

  // If the game's already started, notify the user and exit.
  if (doc.game_started || doc.game_ended) {
    // Notifies beta that the game has already started, but we're automatically
    // opting her into a solo game. 
    message.singleUser(joiningBetaPhone, gameConfig.game_in_progress_oip);
    var soloController = new SGSoloController;
    setTimeout(
      function() {
        soloController.createSoloGame(request.get('host'), doc.story_id, 'competitive-story', joiningBetaPhone)
      } , BETA_TO_SOLO_AFTER_GAME_ALREADY_STARTED_DELAY);
    return;
  }

  // Update game doc marking this beta as having joined the game
  for (var i = 0; i < doc.betas.length; i++) {
    if (doc.betas[i].phone == joiningBetaPhone) {
      doc.betas[i].invite_accepted = true;
      break;
    }
  }

  // Check if all betas have joined.
  var numWaitingOn = 0;
  var allJoined = true;
  for (var i = 0; i < doc.betas.length; i++) {
    if (doc.betas[i].invite_accepted == false) {
      allJoined = false;
      numWaitingOn++;
    }
  }

  // If all have joined, then start the game.
  if (allJoined) {
    doc = start.game(doc);
  }
  // If we're still waiting on people, send appropriate messages to the recently
  // joined beta and alpha users.
  else {
    doc = name.betaJoin(gameConfig, doc, joiningBetaPhone);
  }

  // Save the doc in the database with the betas and current status updates.
  gameModel.update(
    {_id: doc._id},
    {$set: {
      betas: doc.betas,
      game_started: doc.game_started,
      players_current_status: doc.players_current_status
    }},
    function(err, num, raw) {
      if (err) {
        logger.error(err);
      }
      else {
        emitter.emit('game-updated');
        logger.info('Beta joined game. Updating game doc:', doc._id.toString());
      }
    }
  );
};
