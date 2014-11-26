var emitter = require('../../../eventEmitter')
  , logger = require('../../logger')
  , gameConfig = require('../config/competitive-stories')
  , gameModel = require('../models/sgCompetitiveStory')
  ;

/**
 * Callback after alpha's game is found. Handles an alpha choosing to start
 * the game before all players have joined.
 */
module.exports = function(obj, doc) {
  // Start the game.
  doc.game_started = true;
  doc = obj.startGame(gameConfig, doc);
  obj.response.send();

  // Save the doc in the database with the current status updates.
  gameModel.update(
    {_id: doc._id},
    {$set: {
      players_current_status: doc.players_current_status,
      game_started: doc.game_started
    }},
    function(err, num, raw) {
      if (err) {
        logger.error(err);
      }
      else {
        emitter.emit('game-updated');
        logger.info('Alpha is starting the game. Updating game doc:', doc._id.toString());
      }
    }
  );
};