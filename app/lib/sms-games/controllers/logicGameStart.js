var gameConfig = require('../config/competitive-stories')
  , message = require('./gameMessageHelpers')
  , utility = require('./gameUtilities')
  , record = require('./gameRecordHelpers')
  , STATHAT_CATEGORY = 'sms-games'
  ;

/**
 * Starts the game.
 *
 * @param gameDoc
 *   Game document for users to start the game for.
 *
 * @return Updated game document.
 */
var startGame = function(gameDoc) {
  // Get the starting opt in path from the game config.
  var startMessage = gameConfig[gameDoc.story_id].story_start_oip;

  // Opt in the alpha user.
  message.singleUser(gameDoc.alpha_phone, startMessage);

  // Update the alpha's current status.
  gameDoc = record.updatedPlayerStatus(gameDoc, gameDoc.alpha_phone, startMessage);

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

module.exports = startGame;