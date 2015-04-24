var mobilecommons = rootRequire('mobilecommons')
  , emitter = rootRequire('app/eventEmitter')
  , logger = rootRequire('app/lib/logger')
  , connectionOperations = rootRequire('app/config/connectionOperations')
  , gameModel = rootRequire('app/lib/sms-games/models/sgCompetitiveStory')(connectionOperations)
  , userModel = rootRequire('app/lib/sms-games/models/sgUser')(connectionOperations)
  , utility = require('./gameUtilities')
  , record = require('./gameRecordHelpers')
  , SGSoloController = require('./SGSoloController')
  , BETA_TO_SOLO_AFTER_GAME_ENDED_FROM_PLAYER_EXIT_DELAY = 3000
  ;

// StatHat analytics marker. 
var STATHAT_CATEGORY = 'sms-games'
// Delay (in milliseconds) for end game universal group messages to be sent.
  , UNIVERSAL_GROUP_ENDGAME_MESSAGE_DELAY = 23000
  ;

module.exports = {
  // Direct messaging functions. 
  singleUser : singleUser, 
  group : group, 
  singleUserWithDelay : singleUserWithDelay, 
  giveSoloOptionAfterDelay : giveSoloOptionAfterDelay,
  wait : wait,
  endGameFromPlayerExit: endGameFromPlayerExit,
  
  // Calculates and sends end-level and end-game messages.
  end : {
    level : {
      indiv: endLevelIndiv,
      group: endLevelGroup
    },
    game : {
      indiv: endGameIndiv,
      group: endGameGroup
    }
  }
}

/**
 * Schedule a message to be sent to a SINGLE user via a Mobile Commons optin.
 *
 * @param phoneNumber
 *   The phone number of the user.
 * @param optinPath
 *   The opt in path of the message we want to send the user. 
 */
function singleUser(phoneNumber, optinPath) {
  var args = {
    alphaPhone: phoneNumber,
    alphaOptin: optinPath
  };
  mobilecommons.optin(args);
  emitter.emit('single-user-opted-in', args); // Event currently used in testing. 
}

/**
 * Schedule a message to be sent to a GROUP of users via Mobile Commons optins.
 *
 * @param alphaPhone
 *   The phone number of the alpha user. (For the purposes of this function, 
 *   it's arbitrary which phone is designated the alpha, and which phones are
 *   designated the betas. This distinction is only important because all the 
 *   beta numbers will be opted into the same distinct opt in path.) 
 * @param alphaOptin
 *   The opt in path of the alpha user. 
 * @param singleBetaPhoneOrArrayOfPhones
 *   Can take either a 1) a number or string representing a single beta phone
 *   or 2) an array of phones representing more than one beta phone. 
 * 
 * @param betaOptin
 *    The opt in path for ALL the beta phones. 
 */
function group(alphaPhone, alphaOptin, singleBetaPhoneOrArrayOfPhones, betaOptin) {
  var args = {
    alphaPhone: alphaPhone,
    alphaOptin: alphaOptin,
    betaOptin: betaOptin, 
    betaPhone: singleBetaPhoneOrArrayOfPhones
  };
  mobilecommons.optin(args);
  emitter.emit('group-of-users-opted-in', args); // Event currently unused in testing. 
}

/**
 * Schedule a delayed message to be sent to a SINGLE user via Mobile Commons optin. 
 * After the delay time period has passed, this function first checks to see whether 
 * or not the user has been invited into another game by determining if the userModel 
 * of that user has a .current_game_id property different than the currentGameId param 
 * passed into the function. 
 *
 * @param phoneNumber
 *   The phone number of the user we're sending a delayed message. 
 * @param optinPath
 *   The opt in path of the message we're sending the user. 
 * @param delay
 *   The length of time, in milliseconds, before the message is sent (or not sent, if the user has invited
 *   to another game.)
 * @param currentGameId
 *   The Mongo-generated game id of the current game we are calling this function on.
 * @param userModel
 *   A reference to Mongoose userModel to which we're querying in order to retrieve 
 *   the specific user's user document.
 * @param profileUpdateObj
 *   An optional object of key-value pairs which, if passed, is applied to the user's MC profile.
 */
function singleUserWithDelay(phoneNumber, optinPath, delay, currentGameId, userModel, profileUpdateObj) {
  if (!phoneNumber || !optinPath || !delay || !currentGameId || !userModel) {
    return;
  }

  function sendSMS(_phoneNumber, _optinPath, _currentGameId, _userModel, _profileUpdateObj) {
    _userModel.findOne({phone: _phoneNumber}, function(err, userDoc) {
      if (!err) {
        // If a user's in a game that has been ended, the current_game_id property will be removed
        // from her user document. Checking to see if current_game_id still exists for that user. 
        if (userDoc.current_game_id && (userDoc.current_game_id.equals(_currentGameId))) {
          var args = {alphaPhone: _phoneNumber, alphaOptin: _optinPath};
          if (_profileUpdateObj) {
            for (key in _profileUpdateObj) {
              args[key] = _profileUpdateObj[key];
            }
          }
          mobilecommons.optin(args);
          emitter.emit('single-user-opted-in-after-delay', args); // Event currently unused in testing. 
        }
        else {
          logger.info('**A player in the previous game has been invited to a new',
                      'game, and no one in the previous game will now receive',
                      'delayed end-level or end-game messages!**');
        }
      }
      else {
        logger.error('Error in delayedOptinSinglerUser(): ', err);
      }
    });
  }
  setTimeout(function() { sendSMS(phoneNumber, optinPath, currentGameId, userModel, profileUpdateObj); }, delay);
}

/**
 * Schedule a message to be sent to ask Alpha if she wants to play solo.
 *
 * @param gameId
 *   Game ID of the game to check.
 * @param gameModel
 *   Mongoose model to search with.
 * @param oip
 *   Solo-play opt-in path.
 */
function giveSoloOptionAfterDelay(gameId, gameModel, oip, delay) {
  var checkIfBetaJoined = function(_gameId, _gameModel, _oip) {
    var findGame = _gameModel.findById(_gameId).exec();
    findGame.then(function(doc) {
      var aBetaHasJoined = false;
      for (var i = 0; i < doc.betas.length; i++) {
        if (doc.betas[i].invite_accepted == true) {
          aBetaHasJoined = true;
          break;
        }
      }
      // If no Betas have joined and the game-type is NOT solo, ask the alpha
      // if she wants to play SOLO.
      if ((!aBetaHasJoined) && (doc.game_type !== 'solo')) {
        optinSingleUser(doc.alpha_phone, _oip);
      }
    }, utility.promiseErrorCallback('Unable to find game.'));
  };

  setTimeout(function(){ checkIfBetaJoined(gameId, gameModel, oip) }, delay);
}

/**
 * Send messages to the alpha and recently joined beta user about the pending
 * game status.
 *
 * @param gameConfig
 *   Config object with game story details.
 * @param gameDoc
 *   Game document for users of the pending game.
 * @param betaPhone
 *   Phone number of the recently joined beta to send a message to.
 *
 * @return Updated game document.
 */
function wait(gameConfig, gameDoc, betaPhone) {
  var alphaMessage = gameConfig.alpha_start_ask_oip;
  var betaMessage = gameConfig.beta_wait_oip;

  // Send message to alpha asking if they want to start now.
  module.exports.singleUser(gameDoc.alpha_phone, alphaMessage);

  // Update the alpha's current status.
  gameDoc = record.updatedPlayerStatus(gameDoc, gameDoc.alpha_phone, alphaMessage);

  // Send the waiting message to the beta user.
  module.exports.singleUser(betaPhone, betaMessage);

  // Update the beta's current status.
  gameDoc = record.updatedPlayerStatus(gameDoc, betaPhone, betaMessage);

  return gameDoc;
}

/**
 * End a game due to a player exiting it.
 *
 * @param playerDocs
 *   Player documents for players leaving a game.
 */
function endGameFromPlayerExit(playerDocs) {
  if (playerDocs.length == 0) {
    return; 
  }

  // Using the user documents found before and stored inside the playerDocs array, 
  // we find all games the players were previously in.
  var findCondition = {};
  for (var i = 0; i < playerDocs.length; i++) {
    if (typeof findCondition['$or'] === 'undefined') {
      findCondition['$or'] = [];
    }

    // Because we're using the current_game_id from the playerDocs found before
    // the .then() callback, this might not cause asynchronous problems.
    findCondition['$or'][i] = {_id: playerDocs[i].current_game_id};
  }

  var self = this;
  var promise = gameModel.find(findCondition).exec();
  promise.then(function(docs) {

    // For each game still in progress...
    for (var i = 0; i < docs.length; i++) {

      var gameDoc = docs[i];
      var gameConfig = app.getConfig(app.ConfigName.COMPETITIVE_STORIES, gameDoc.story_id);

      // Skip games that have already ended.
      var skipGame = false;
      if (gameDoc.game_ended) {
        skipGame = true;
      }
      // Skip games where the player is not in the game.
      else {
        var noActivePlayerInGame = true;
        for (var j = 0; j < playerDocs.length; j++) {
          if (playerDocs[j].current_game_id.equals(gameDoc._id) == false) {
            continue;
          }

          if (playerDocs[j].phone == gameDoc.alpha_phone) {
            noActivePlayerInGame = false;
            continue;
          }

          for (var k = 0; k < gameDoc.betas.length; k++) {
            if (playerDocs[j].phone == gameDoc.betas[k].phone && gameDoc.betas[k].invite_accepted) {
              noActivePlayerInGame = false;
              continue;
            }
          }
        }

        if (noActivePlayerInGame) {
          skipGame = true;
        }
      }

      if (skipGame) {
        continue;
      }

      // Find users to message that the game has ended. Note that this messages all users in 
      // games created before the game model's .game_ended property was implemented. 
      var players = [];
      for (var j = 0; j < gameDoc.players_current_status.length; j++) {

        // Do not send this message to the users who've been invited out of their game.
        var doNotMessage = false;
        for (var k = 0; k < playerDocs.length; k++) {
          if (gameDoc.players_current_status[j].phone == playerDocs[k].phone) { 
            doNotMessage = true;
            break;
          }
        }

        if (!doNotMessage) {
          players[players.length] = gameDoc.players_current_status[j].phone;
        }
      }

      // Update game documents as having ended.
      gameModel.update(
        {_id: gameDoc._id},
        {$set: {game_ended: true}},
        function(err, num, raw) {
          if (err) {
            logger.error(err);
          }
        }
      );

      // For players who were in ended games...
      for (var playerIdx = 0; playerIdx < players.length; playerIdx++) {
        var currentPlayerPhone = players[playerIdx];
        // Remove the current_game_id from their document.
        userModel.update(
          {phone: currentPlayerPhone},
          {$unset: {current_game_id: 1}},
          function(err, num, raw) {
            if (err) {
              logger.error(err);
            }
          }
        );

        // Message them that the game has ended, and we're opting them into a solo game.
        module.exports.singleUser(currentPlayerPhone, gameConfig.game_ended_from_exit_oip);
        var soloController = new SGSoloController;
        setTimeout(
          function() {
            soloController.createSoloGame(app.hostName, gameDoc.story_id, 'competitive-story', currentPlayerPhone) 
          }, BETA_TO_SOLO_AFTER_GAME_ENDED_FROM_PLAYER_EXIT_DELAY
        );
      }
    }
  },
  utility.promiseErrorCallback('Unable to end player game docs within _endGameFromPlayerExit function.'));
}

/**
 * Get the end-level opt-in path to send to a user based on the user's answers
 * and the defined criteria in the story.
 *
 * @param phone
 *   User's phone number.
 * @param level
 *   Key to find the level's config. ex: END-LEVEL2
 * @param storyConfig
 *   Object defining details for the current story.
 * @param gameDoc
 *   Document for the current game.
 * @param checkResultType
 *   What property the conditions are checking against. Either "oip" or "answer".
 *
 * @return Boolean
 */
function endLevelIndiv(phone, level, storyConfig, gameDoc, checkResultType) {
  var levelTag;
  if (level === 'END-GAME') {
    levelTag = level;
  }
  else {
    // Get the level number from the end.
    levelTag = level.slice(-1);
  }

  // Report total count of individual players reaching the end of a level
  var stathatAction = 'end level ';
  if (phone == gameDoc.alpha_phone) {
    utility.stathatReportCount(STATHAT_CATEGORY, stathatAction + '(alpha)', levelTag, gameDoc.story_id, 1);
  }
  else {
    utility.stathatReportCount(STATHAT_CATEGORY, stathatAction + '(beta)', levelTag, gameDoc.story_id, 1);
  }

  var storyItem = storyConfig.story[level];
  if (typeof storyItem === 'undefined') {
    return null;
  }

  // Determine next opt in path based on player's choices vs conditions.
  var nextOip = null;
  for (var i = 0; i < storyItem.choices.length; i++) {
    if (utility.evaluateCondition(storyItem.choices[i].conditions, phone, gameDoc, checkResultType)) {
      nextOip = storyItem.choices[i].next;
      break;
    }
  }
  return nextOip;
}

/**
 * Evaluates and returns the opt-in path for the message to be sent to the entire
 * group at the end of a level.
 *
 * @param endLevelGroupKey
 *   String key (ex: "END-LEVEL1-GROUP") to find details on how to evaluate the end level group message.
 * @param storyConfig
 *   Object defining details for the current story.
 * @param gameDoc
 *   Document for the current game.
 *
 * @return End level group message opt-in path.
 */
function endLevelGroup(endLevelGroupKey, storyConfig, gameDoc) {
  // Report total count of groups that reach the end of a level
  var levelTag = endLevelGroupKey.substr(-7, 1);
  utility.stathatReportCount(STATHAT_CATEGORY, 'end level (group)', levelTag, gameDoc.story_id, 1);

  var storyItem = storyConfig.story[endLevelGroupKey];

  // Initializing values to 0
  var choiceCounter = [];
  for (var i = 0; i < storyItem.choices.length; i++) {
    choiceCounter[i] = 0;
  }

  // Evaluate which condition players match
  for (var i = 0; i < gameDoc.players_current_status.length; i++) {
    var phone = gameDoc.players_current_status[i].phone;
    for (var j = 0; j < storyItem.choices.length; j++) {
      var conditions = storyItem.choices[j].conditions;
      if (utility.evaluateCondition(conditions, phone, gameDoc, 'answer')) {
        choiceCounter[j]++;
        break;
      }
    }
  }

  // Find out which condition was matched the most
  var selectChoice = -1;
  var maxCount = -1;
  for (var i = 0; i < choiceCounter.length; i++) {
    if (choiceCounter[i] > maxCount) {
      selectChoice = i;
      maxCount = choiceCounter[i];
    }
  }
  return storyItem.choices[selectChoice].next;
}

/**
 * Gets the unique, individual end game message for a particular user
 *
 * @param phone
 *   User's phone number.
 * @param gameConfig
 *   Object defining details for the current story.
 * @param gameDoc
 *   Document for the current game.
 *
 * @return End game individual message opt-in path
 */
function endGameIndiv(phone, gameConfig, gameDoc) {
  var indivMessageEndGameFormat = gameConfig.story['END-GAME']['indiv-message-end-game-format'];
  if (indivMessageEndGameFormat == 'individual-decision-based') {
    return module.exports.end.level.indiv(phone, 'END-GAME', gameConfig, gameDoc, 'answer');
  }
  else if (indivMessageEndGameFormat == 'rankings-within-group-based') {
    return _getEndGameRankMessage(phone, gameConfig, gameDoc);
  }
  else {
    logger.error('This story has an indeterminate endgame format.');
  }

  /**
  * Calculates the ranking of all players; returns appropriate ranking oip for indiv player.
  * 
  * @param phone
  *   User's phone number.
  * @param gameConfig
  *   Object defining details for the current story.
  * @param gameDoc
  *   Document for the current game.
  * 
  * @return End game individual ranking opt-in-path. 
  */

  function _getEndGameRankMessage(phone, gameConfig, gameDoc) {
    var gameDoc = gameDoc;
    // If we haven't run the ranking calculation before. 
    if (!gameDoc.players_current_status[0].rank) {
      var tempPlayerSuccessObject = {};
      var indivLevelSuccessOips = gameConfig.story['END-GAME']['indiv-level-success-oips'];
      // Populates the tempPlayerSuccess object with all the players. 
      for (var i = 0; i < gameDoc.players_current_status.length; i++) {
        tempPlayerSuccessObject[gameDoc.players_current_status[i].phone] = 0;
      }

      // Counts the number of levels each user has successfully passed.
      for (var i = 0; i < indivLevelSuccessOips.length; i++) {
        for (var j = 0; j < gameDoc.story_results.length; j++) {
          if (indivLevelSuccessOips[i] === gameDoc.story_results[j].oip) {
            tempPlayerSuccessObject[gameDoc.story_results[j].phone]++;
          }
        }
      }

      // Converts success count into an array. 
      var playerRankArray = [];
      for (var playerPhoneNumber in tempPlayerSuccessObject) {
        if (tempPlayerSuccessObject.hasOwnProperty(playerPhoneNumber)) {
          var playerSuccessObject = {'phone': playerPhoneNumber, 'levelSuccesses': tempPlayerSuccessObject[playerPhoneNumber]};
          playerRankArray.push(playerSuccessObject);
        }
      }

      // Sorts players by number of levels successfully completed,
      // least number of levels completed to most number of levels.
      playerRankArray.sort(function(playerA, playerB){
        if (playerA.levelSuccesses > playerB.levelSuccesses) {
          return 1;
        } 
        else if (playerA.levelSuccesses < playerB.levelSuccesses) {
          return -1;
        } 
        else {
          return 0;
        }
      })

      // Adds each user's rank to the gameDoc,
      // indicating ties for first and second place.
      var FIRST_PLACE_NUMERAL = 1;
      var LAST_PLACE_NUMERAL = 4;
      for (var i = FIRST_PLACE_NUMERAL; i <= LAST_PLACE_NUMERAL; i++) {
        if (!playerRankArray.length) {
          break;
        }
        var nextRank = [];
        nextRank.push(playerRankArray.pop());
        // If there's a tie.
        while ((playerRankArray.length) && (nextRank[0].levelSuccesses == playerRankArray.slice(-1)[0].levelSuccesses)) {
          nextRank.push(playerRankArray.pop());
        }
        for (var j = 0; j < nextRank.length; j++) {
          for (var k = 0; k < gameDoc.players_current_status.length; k++) {
            if (gameDoc.players_current_status[k].phone == nextRank[j].phone) {
              // We only record and signify ties for first and second place.
              if (nextRank.length > 1 && (i === 1||i === 2)) {
                gameDoc.players_current_status[k].rank = i + '-tied';
              } 
              else {
                gameDoc.players_current_status[k].rank = i;  
              }
            }
          }
        }
      }
    }
    
    // Returns the opt in path for the indicated user's ranking. 
    for (var i = 0; i < gameDoc.players_current_status.length; i++) {
      if (gameDoc.players_current_status[i].phone === phone) {
        var playerRanking = gameDoc.players_current_status[i].rank;
        return gameConfig.story['END-GAME']['indiv-rank-oips'][playerRanking];
      }
    }
    return false;
  }
}
/**
 * 1) Checks the group endgame format of a game, on based on that:
 * 2) Retrieves the group endgame message,
 * 3) Sends that message to all game players,
 * 4) Updates the gamedoc's storyResults and players' current status
 * 5) Returns the updated gamedoc.
 *
 * @param gameConfig
 *   JSON object defining details for the current story.
 * @param gameDoc
 *  document for the current game
 *
 * @return The updated gamedoc.
 */
function endGameGroup(gameConfig, gameDoc) {
  if (gameConfig.story['END-GAME']['group-message-end-game-format'] == 'group-success-failure-based') {
    var nextPathForAllPlayers = _getUniversalEndGameGroupMessage(gameConfig, gameDoc)
    // Iterating through all players, enrolling them in this new OIP.
    for (var j = 0; j < gameDoc.players_current_status.length; j ++) {
      var currentPlayer = gameDoc.players_current_status[j].phone;

      // If the game has ended, the universal group endgame message is
      // sent THIRD (or second-last) of all the messages in execUserAction().
      module.exports.singleUserWithDelay(currentPlayer, nextPathForAllPlayers, UNIVERSAL_GROUP_ENDGAME_MESSAGE_DELAY, gameDoc._id, userModel);

      gameDoc = record.updatedPlayerStatus(gameDoc, currentPlayer, nextPathForAllPlayers);
      gameDoc = record.updatedStoryResults(gameDoc, currentPlayer, nextPathForAllPlayers);
    }
  }
  return gameDoc;

  /**
   * Gets the universal end game message to be sent to a group.
   *
   * @param gameConfig
   *   JSON object defining details for the current story.
   * @param gameDoc
   *  document for the current game
   *
   * @return The oip of the final group message.
   */
  function _getUniversalEndGameGroupMessage(gameConfig, gameDoc) {
    // An array of oips which represent group end-level impact paths.
    var groupLevelSuccessOips = gameConfig.story['END-GAME']['group-level-success-oips'];

    // A hash. Key --> number of levels where group successfully received
    // impact condition; value --> end-level oip that number of levels unlocks,
    // which is sent to all players.
    var groupSuccessFailureOips = gameConfig.story['END-GAME']['group-success-failure-oips'];
    var levelSuccessCounter = 0;

    // Iterates through the user action documents in story results.
    for (var i = 0; i < groupLevelSuccessOips.length; i++) {
      for (var j = 0; j < gameDoc.story_results.length; j++) {
        if (groupLevelSuccessOips[i] === gameDoc.story_results[j]['oip']) {
          levelSuccessCounter++;
          break;
        }
      }
    }
    return groupSuccessFailureOips[levelSuccessCounter];
  }
}