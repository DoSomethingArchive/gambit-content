var smsHelper = require('../../smsHelpers')
  , emitter = require('../../../eventEmitter')
  , logger = require('../../logger')
  , gameModel = require('../models/sgCompetitiveStory')
  , userModel = require('../models/sgUser')
  , gameConfig = require('../config/competitive-stories')
  , message = require('./gameMessageHelpers')
  , utility = require('./gameUtilities')
  , record = require('./gameRecordHelpers')
  ;

// Delay (in milliseconds) for end level group messages to be sent.
var END_LEVEL_GROUP_MESSAGE_DELAY = 15000
// Delay (in milliseconds) for next level start messages to be sent.
  , NEXT_LEVEL_START_DELAY = 30000
// StatHat analytics marker. 
  , STATHAT_CATEGORY = 'sms-games'

/**
 * Callback after user's game is found. Determines how to progress the user
 * forward in the story based on her answer.
 */
module.exports = function(obj, doc) {

  // Uppercase and only get first word of user's response.
  var userFirstWord = smsHelper.getFirstWord(obj.request.body.args.toUpperCase());

  // Find player's current status.
  var userPhone = smsHelper.getNormalizedPhone(obj.request.body.phone);
  var currentOip = 0;
  for (var i = 0; i < doc.players_current_status.length; i++) {
    if (doc.players_current_status[i].phone == userPhone) {
      currentOip = doc.players_current_status[i].opt_in_path;
      break;
    }
  }

  // Get the story config.
  var storyConfig = gameConfig[doc.story_id];

  // Check if user response is valid.
  var choiceIndex = -1;
  var storyItem = storyConfig.story[currentOip];

  if (storyItem && storyItem.choices) {
    for (var i = 0; i < storyItem.choices.length; i++) {
      var choice = storyItem.choices[i];

      // Check if user's response is a valid choice.
      for (var j = 0; j < choice.valid_answers.length; j++) {

        // Using regex to allow for some additional characters after a valid
        // answer. For example, a user might enter 'A)' and in our valid_answers
        // array we might only have listed 'A'. We still want 'A)' to be valid.
        var allowableChars = '[s\\.\\,\\?\\*\\)\\}\\]]*';
        var validAnswer = choice.valid_answers[j];
        var regex = new RegExp('^' + validAnswer + allowableChars + '$', 'i');
        if (userFirstWord.match(regex)) {
          choiceIndex = i;
          break;
        }
      }

      // Break the loop if we've got a valid answer
      if (choiceIndex != -1) {
        break;
      }
    }
  }

  var nextOip = 0;
  // We have a valid answer if choiceIndex is >= 0
  if (choiceIndex >= 0) {
    // Use the choice key as the answer to save in the database.
    var choiceKey = storyItem.choices[choiceIndex].key;

    // Update the results of the player's progression through a story.
    // Note: Sort of hacky, this needs to be called before message.end.level.indiv()
    // and message.end.game.indiv() because they use the story_results array in the
    // game document to determine what the next message should be.
    var gameDoc = doc;
    gameDoc = record.updatedStoryResults(gameDoc, userPhone, currentOip, choiceKey);

    // Progress player to the next message.
    nextOip = storyItem.choices[choiceIndex].next;
    // Update the game document with player's current status.
    gameDoc = record.updatedPlayerStatus(gameDoc, userPhone, nextOip);

    // Player has reached the end of a level.
    if (typeof nextOip === 'string' && nextOip.match(/^END-LEVEL/)) {
      var level = nextOip;
      nextOip = message.end.level.indiv(userPhone, level, storyConfig, gameDoc, 'answer');
      gameDoc = record.updatedPlayerStatus(gameDoc, userPhone, nextOip);
      gameDoc = record.updatedStoryResults(gameDoc, userPhone, nextOip);

      // Check if all players are waiting in an end-level state.
      var readyForNextLevel = true;
      for (var i = 0; i < gameDoc.players_current_status.length; i++) {
        // Skip this current user.
        if (gameDoc.players_current_status[i].phone == userPhone) {
          continue;
        }

        var playerAtEndLevel = false;
        var currentStatus = gameDoc.players_current_status[i].opt_in_path;
        for (var j = 0; j < storyConfig.story[level].choices.length; j++) {
          if (currentStatus == storyConfig.story[level].choices[j].next) {
            playerAtEndLevel = true;
            break;
          }
        }

        if (!playerAtEndLevel) {
          readyForNextLevel = false;
          break;
        }
      }

      // All players have reached the end of the level.
      if (readyForNextLevel) {

        /**
         * Note: This probably isn't clear from just glancing at the code. The
         * following two group messages are sent after a delay. But for this
         * current user, she'll additionally be receiving the individual end
         * level message first.
         */

        // Send group the end level message.
        var endLevelGroupKey = level + '-GROUP';
        var groupOptin = message.end.level.group(endLevelGroupKey, storyConfig, gameDoc);
        for (var i = 0; i < gameDoc.players_current_status.length; i++) {
          var playerPhone = gameDoc.players_current_status[i].phone;  

          // Send group the end level message. The end level group message is sent 
          // SECOND of all the messages in the execUserAction() function call.

          message.singleUserWithDelay(playerPhone, groupOptin, END_LEVEL_GROUP_MESSAGE_DELAY, gameDoc._id, userModel);
          gameDoc = record.updatedStoryResults(gameDoc, playerPhone, groupOptin);
        }

        // Note: Doing this `gameEnded` for loop separately from the end-level message so
        // that results for all players can be updated before figuring out the
        // final messages.
        // Send group the next level message.
        var gameEnded = false;
        var nextLevel = storyConfig.story[endLevelGroupKey].next_level;
        for (var i = 0; i < gameDoc.players_current_status.length; i++) {
          var playerPhone = gameDoc.players_current_status[i].phone;
          var nextPath = nextLevel;
          // End game message needs to be determined per player
          if (nextLevel == 'END-GAME') {
            // If gameEnded is true; if this is the first player we're
            // running endGame calculations on.
            if (!gameEnded){
              // Sends universal GROUP endgame message (sent THIRD,
              // or second-last); updates gamedoc.
              gameDoc = message.end.game.group(storyConfig, gameDoc);
            }
            gameEnded = true;
            // This is setting the next OIP to the INDIVIDUAL end-game message.
            nextPath = message.end.game.indiv(playerPhone, storyConfig, gameDoc);
          }

          // Sends individual user the next level message.
          var optinArgs = {
            alphaPhone: playerPhone,
            alphaOptin: nextPath
          };

          // Sends individual user the next level message. The next level message
          // (or if at end-game, end-game unique individual message)
          // is sent LAST in the execUserAction() function call.
          message.singleUserWithDelay(playerPhone, nextPath, NEXT_LEVEL_START_DELAY, gameDoc._id, userModel);

          gameDoc = record.updatedStoryResults(gameDoc, playerPhone, nextPath);

          // Update player's current status to the end game or next level message.
          gameDoc = record.updatedPlayerStatus(gameDoc, playerPhone, nextPath);
        }
      }
    }

    // If the game is over, log it to stathat.
    if (gameEnded == true) {
      gameDoc.game_ended = true;
      utility.stathatReportCount(STATHAT_CATEGORY, 'end game', 'success', gameDoc.story_id, 1);
    }

    // Update the player's current status in the database. (Or ALL of the players' current statuses,
    // if we're at the end-level or end-game situation.)
    gameModel.update(
      {_id: doc._id},
      {$set: {
        players_current_status: gameDoc.players_current_status,
        story_results: gameDoc.story_results,
        game_ended: gameDoc.game_ended
      }},
      function(err, num, raw) {
        if (err) {
          logger.error(err);
        }
        else {
          emitter.emit('player-status-updated');
          logger.info('SGCompetitiveStoryController.userAction - Updated player\'s',
                      'current status in game doc:', doc._id.toString());
        }
      }
    );
  }
  else {
    // If the user's response isn't a valid answer, 
    // resend the same message by opting into the current path again.
    nextOip = currentOip;
  }

  // Send next immediate message via Mobile Commons opt in.
  if (userPhone && nextOip) {
    // The individual response message is sent FIRST
    // in the execUserAction() function call.
    message.singleUser(userPhone, nextOip);

    obj.response.send();
  }
  else {
    obj.response.status(500).send('Story configuration invalid.');
  }
};