var gameModel = require('../models/sgCompetitiveStory')
  , Q = require('q')
  , logger = require('../../logger')
  , utility = require('./gameUtilities')
  , SGSoloController = require('./SGSoloController')
  , emitter = require('../../../eventEmitter')
  , startGame = require('./logicGameStart');

var AUTO_START_GAME_DELAY = 300000;

/**
 * Checks game status. If any number of betas have joined, automatically starts the game. 
 * If no betas have joined, creates and starts a solo game for the alpha. 
 *
 * @param gameId
 *   ID of game document. 
 */
var gameAutoStart = function(gameId) {

  var createAndStartSoloOrStartMulti = function(gameId) {
    gameModel.findById(gameId, function(err, doc) {
      if (err) {
        console.log(err)
      } 
      else {
        var betas = doc.betas;
        for (var i = 0; i < betas.length; i ++) {
          if (doc.betas[i].invite_accepted == true) {
            doc = startGame(doc);
            console.log(doc);
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
                  logger.info('Multiplayer game auto-starting. Updating game doc:', doc._id.toString());
                }
              }
            );
            return;
          }
        }
        var soloController = new SGSoloController;
        soloController.createSoloGame(app.hostName, doc.story_id, 'competitive-story', doc.alpha_phone);
      }
    })
  }

  setTimeout(function() { createAndStartSoloOrStartMulti(gameId) }, AUTO_START_GAME_DELAY);
}

module.exports = gameAutoStart;