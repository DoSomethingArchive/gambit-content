var gameConfig = require('../config/competitive-stories')
  , connectionOperations = rootRequire('app/config/connectionOperations')
  , gameModel = rootRequire('app/lib/sms-games/models/sgCompetitiveStory')(connectionOperations)
  , message = require('./gameMessageHelpers')
  , utility = require('./gameUtilities')
  , record = require('./gameRecordHelpers')
  , SGSoloController = require('./SGSoloController')
  , emitter = rootRequire('app/eventEmitter')
  , logger = rootRequire('app/lib/logger')
  , STATHAT_CATEGORY = 'sms-games'
  , AUTO_START_GAME_DELAY = 300000;

module.exports = {
  game : startGame,
  auto : autoStartGame
}

/**
 * Starts the game.
 *
 * @param gameDoc
 *   Game document of the game we're starting.
 *
 * @return Game document, updated with the requisite state changes.
 */
function startGame(gameDoc) {
  // Get the starting opt in path from the game config.
  var startMessage = gameConfig[gameDoc.story_id].story_start_oip;

  // Opt in the alpha user.
  message.singleUser(gameDoc.alpha_phone, startMessage);

  // Update the alpha's current status.
  gameDoc = record.updatedPlayerStatus(gameDoc, gameDoc.alpha_phone, startMessage);

  // Mark the game as having started. 
  gameDoc.game_started = true;

  // Alpha
  var numPlayers = 1;

  // Opt in the beta users who have joined.
  for (var i = 0; i < gameDoc.betas.length; i++) {
    if (gameDoc.betas[i].invite_accepted == true) {
      message.singleUser(gameDoc.betas[i].phone, startMessage);

      // Update the beta's current status.
      gameDoc = record.updatedPlayerStatus(gameDoc, gameDoc.betas[i].phone, startMessage);

      numPlayers++;
    }
  }

  // Report start game stats to StatHat
  var stathatAction = 'start game';
  utility.stathatReportValue(STATHAT_CATEGORY, stathatAction, 'number of players (avg)', gameDoc.story_id, numPlayers);
  utility.stathatReportCount(STATHAT_CATEGORY, stathatAction, 'number of players (total)', gameDoc.story_id, numPlayers);
  utility.stathatReportCount(STATHAT_CATEGORY, stathatAction, 'success', this.storyId, 1);
  return gameDoc;
};

/**
 * Checks game status. If any number of betas have joined, automatically starts the game. 
 * If no betas have joined, creates and starts a solo game for the alpha. 
 *
 * @param gameId
 *   ID of game document. 
 */
function autoStartGame(gameId) {

  function createAndStartSoloOrStartMulti(gameId) {
    gameModel.findById(gameId, function(err, doc) {
      if (err) {
        logger.error('Error in running auto-start game function for gameId: ' + gameId + ' Error: ' + err);
      }
      else if (doc.game_started !== true) {

        var isMultiplayer = false;
        var betas = doc.betas;

        for (var i = 0; i < betas.length; i ++) {
          if (doc.betas[i].invite_accepted == true) {
            isMultiplayer = true;
            break;
          }
        }

        if (isMultiplayer) {
          doc = startGame(doc);
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
        }
        else {
          var soloController = new SGSoloController;
          soloController.createSoloGame(app.hostName, doc.story_id, 'competitive-story', doc.alpha_phone);
        }

      }
    })
  }

  setTimeout(function() { createAndStartSoloOrStartMulti(gameId) }, AUTO_START_GAME_DELAY);
}
