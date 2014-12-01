var emitter = require('../../../eventEmitter')
  , logger = require('../../logger')
  , gameModel = require('../models/sgCompetitiveStory')
  , gameConfig = require('../config/competitive-stories')
  , message = require('./gameMessageHelpers')
  ;

/**
 * Callback for when beta's game is found. Update persistent storage, send
 * game-pending messages if all players haven't joined yet, or auto-start the
 * game if all players are joined.
 */
module.exports = function(obj, doc) {

  // If the game's already started, notify the user and exit.
  if (doc.game_started || doc.game_ended) {
    // Good place to notify betas about ALPHA SOLO keywords for opt-in-paths. 
    message.singleUser(obj.request.body.phone, gameConfig[doc.story_id].game_in_progress_oip);
    obj.response.send();
    return;
  }

  // Update game doc marking this beta as having joined the game
  for (var i = 0; i < doc.betas.length; i++) {
    if (doc.betas[i].phone == obj.joiningBetaPhone) {
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
    doc.game_started = true;
    doc = obj.startGame(gameConfig, doc);
    obj.response.send();
  }
  // If we're still waiting on people, send appropriate messages to the recently
  // joined beta and alpha users.
  else {
    doc = message.wait(gameConfig, doc, obj.joiningBetaPhone);
    obj.response.send();
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