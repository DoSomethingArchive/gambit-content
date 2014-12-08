var gameModel = require('../models/sgCompetitiveStory')
  , Q = require('q')
  , logger = require('../../logger')
  , utility = require('./gameUtilities')
  , SGCompetitiveStoryController = require('./SGCompetitiveStoryController')
  ;

var AUTO_START_GAME_DELAY = 300000;

/**
 * Checks database for state of game, returns object of player state.
 *
 * @param gameId
 *   ID of game document. 
 * @returns gameCreateDirectiveObject
 *   key-value pairs { player : joinState }
 */

// It's either going to be 1) creating an alpha-solo game, or 2) starting the multiplayer game. What object should I return?

{gameType: solo / multi, players: [playerPhone, playerPhone, playerPhone]}

// Or maybe playerIds? Which is simpler?

var checkPlayerJoinState = function(gameId) {
  gameModel.findById(gameId).exec().then(function(doc) {
    var betas = doc.betas;
    for (var i = 0; i < betas.length; i ++) {
      if (doc.betas[i].invite_accepted == true) {
        SGCompetitiveStoryController.startGame();
      }
    }


  }, utility.promiseErrorCallback('Unable to find game for autoStart.'))

}

/**
 * Based on the gameCreateDirectiveObject, either creates and starts an alpha-solo game or starts a multiplayer game.
 *
 * @param gameCreateDirectiveObject
 *   Contains information about which type of game should be created.
 * @param response
 *   Express response object.
 */
var createAndStartSoloOrStartMulti = function(gameCreateDirectiveObject) {

}

/**
 * Checks game status. If any number of betas have joined, automatically starts the game. 
 * If no betas have joined, creates and starts a solo game for the alpha. 
 *
 * @param gameId
 *   ID of game document. 
 */
var autoStartGame = function(gameId) {
  // checkPlayerJoinState(gameId).then(createAndStartSoloOrStartMulti);
}

module.exports = setTimeout(autoStartGame, AUTO_START_GAME_DELAY);