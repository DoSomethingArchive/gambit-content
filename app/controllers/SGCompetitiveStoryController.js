/**
 * Game controller for the Competitive Story template.
 */

var mobilecommons = require('../../mobilecommons')
  , messageHelper = require('../lib/userMessageHelpers')
  , emitter = require('../eventEmitter')
  , logger = require('../lib/logger')
  ;

// Delay (in milliseconds) for end level group messages to be sent.
var END_LEVEL_GROUP_MESSAGE_DELAY = 15000;

// Delay (in milliseconds) for next level start messages to be sent.
var NEXT_LEVEL_START_DELAY = 30000;

// Delay (in milliseconds) for end game universal group messages to be sent.
var UNIVERSAL_GROUP_ENDGAME_MESSAGE_DELAY = 23000;

// Maximum number of players that can be invited into a game.
var MAX_PLAYERS_TO_INVITE = 3;

// Minimum number of players required to create and/or start a game.
var MIN_PLAYERS_TO_INVITE = 0;

// The time interval between when a multiplayer game is created and 
// when the SOLO option message is sent to the alpha.
var TIME_UNTIL_SOLO_MESSAGE_SENT = 300000; // Five minutes is 300000.

var SGCompetitiveStoryController = function(app) {
  this.app = app;
  this.gameMappingModel = require('../models/sgGameMapping')(app);
  this.gameModel = require('../models/sgCompetitiveStory')(app);
  this.userModel = require('../models/sgUser')(app);
  this.gameConfig = app.get('competitive-stories');
};

/**
 * Setup and update documents for a new Competitive Story game.
 *
 * @param request
 *   Express request object.
 * @param response
 *   Express response object.
 */
SGCompetitiveStoryController.prototype.createGame = function(request, response) {

  // Return a 406 if some data is missing.
  if (typeof request.body === 'undefined'
      || (typeof request.body.story_id === 'undefined'
          && typeof request.query.story_id === 'undefined')
      || typeof request.body.alpha_mobile === 'undefined'
      || typeof request.body.alpha_first_name === 'undefined'
      || typeof request.body.beta_mobile_0 === 'undefined'
      || typeof request.body.beta_mobile_1 === 'undefined'
      || typeof request.body.beta_mobile_2 === 'undefined') {
    response.status(406).send(request.body);
    return false;
  }

  // Allows us to use the .findUserGame(obj, onUserGameFound) 
  // helper function function.
  
  this.request = request;
  if (!this.request.body) {
    this.request.body = {}
  }
  this.request.body.phone = request.body.alpha_mobile;

  // Story ID could be in either POST or GET param.
  this.storyId = null;
  if (typeof request.body.story_id !== 'undefined') {
    this.storyId = request.body.story_id;
  }
  else if (typeof request.query.story_id !== 'undefined') {
    this.storyId = request.query.story_id;
  }

  if (typeof this.gameConfig[this.storyId] === 'undefined') {
    response.status(406).send('Game config not setup for story ID: ' + this.storyId);
    return false;
  }

  var alphaPhone = messageHelper.getNormalizedPhone(request.body.alpha_mobile);
  if (!messageHelper.isValidPhone(alphaPhone)) {
    response.status(406).send('Invalid alpha phone number.');
    return false;
  }

  // Compile a new game document.
  var gameDoc = {
    story_id: this.storyId,
    alpha_name: request.body.alpha_first_name,
    alpha_phone: alphaPhone,
    betas: [],
    game_type: (request.body.game_type || '')
  };

  for (var i = 0; i < MAX_PLAYERS_TO_INVITE; i++) {
    if (request.body['beta_mobile_' + i]) {
      var phone = messageHelper.getNormalizedPhone(request.body['beta_mobile_' + i]);
      if (messageHelper.isValidPhone(phone)) {
        var idx = gameDoc.betas.length;
        gameDoc.betas[idx] = {};
        gameDoc.betas[idx].invite_accepted = false;
        gameDoc.betas[idx].phone = phone;
      }
    }
  }

  // If number of betas invited doesn't meet the minimum number, then error.
  // Note: given the current structure of mobile-to-mobile game creation, 
  // this warning isn't too meaningful for alpha-solo mobile game creation, 
  // since if the beta_mobile_x params are empty, they're populated by empty strings. 

  if (gameDoc.betas.length < MIN_PLAYERS_TO_INVITE) {
    response.status(406).send('Not enough players. You need to invite at least %d to start.', MIN_PLAYERS_TO_INVITE);
    return false;
  }

  // Closure variable to use through chained callbacks.
  var self = this;

  // Save game to the database.
  var game = this.gameModel.create(gameDoc);
  game.then(function(doc) {
    emitter.emit('game-created', doc);
    var config = self.gameConfig[doc.story_id];

    // Sets a time to ask the alpha if she wants to play a solo game.
    scheduleSoloMessage(doc._id, self.gameModel, self.gameConfig[self.storyId].ask_solo_play);

    // Create game id to game type mapping.
    self.gameMappingModel.create(
      {game_id: doc._id, game_model: self.gameModel.modelName},
      function(err, doc) {
        if (err) {
          logger.error(err);
        }
        emitter.emit('game-mapping-created', doc);
      }
    );

    // Build the condition to find existing user documents for all invited players.
    var alphaPhone = messageHelper.getNormalizedPhone(doc.alpha_phone);
    var findCondition = {$or: [{phone: alphaPhone}]};
    for (var i = 0; i < doc.betas.length; i++) {
      var betaPhone = messageHelper.getNormalizedPhone(doc.betas[i].phone);
      findCondition['$or'][i+1] = {phone: betaPhone};
    }
    // Allowing us to use the created saved doc in the function called with the promise. 
    self.createdGameDoc = doc;

    return self.userModel.find(findCondition).exec();
  },
  promiseErrorCallback('Unable to create player game docs within .createGame() function.')).then(function(playerDocs) {

    // End games that these players were previously in.
    self._endGameFromPlayerExit(playerDocs);

    // Upsert the document for the alpha user.
    self.userModel.update(
      {phone: self.createdGameDoc.alpha_phone},
      {$set: {phone: self.createdGameDoc.alpha_phone, current_game_id: self.createdGameDoc._id, updated_at: Date.now()}},
      {upsert: true}, // Creates a new doc when no doc matches the query criteria via '.update()'.
      function(err, num, raw) {
        if (err) {
          logger.error(err);
        }
        else {
          // This response.sendStatus() call has been moved from outside into this 
          // async Mongoose call to ensure that upon SOLO game creation, 
          // the Alpha userModel will have been modified with the SOLO gameId before 
          // the start game logic runs (triggered by the POST to the /alpha-start route.)
          response.sendStatus(201);
          emitter.emit('alpha-user-created');

          if (raw && raw.upserted) {
            logger.info('Alpha user upserted: ', JSON.stringify(raw.upserted));
          }
        }
      });

    self.createdGameDoc.betas.forEach(function(value, index, set) {
      // Upsert user document for the beta.
      self.userModel.update(
        {phone: value.phone},
        {$set: {phone: value.phone, current_game_id: self.createdGameDoc._id, updated_at: Date.now()}},     
        {upsert: true},
        function(err, num, raw) {
          if (err) {
            logger.error(err);
          }
          else {
            emitter.emit('beta-user-created');

            if (raw && raw.upserted) {
              logger.info('Beta user upserted: ', JSON.stringify(raw.upserted));
            }
          }
        }
      );
    });

    var betaOptInArray = []; // Extract phone number for Mobile Commons opt in.
    self.createdGameDoc.betas.forEach(function(value, index, set) {
      betaOptInArray[betaOptInArray.length] = value.phone;
    })

    // We opt users into these initial opt in paths only if the game type is NOT solo. 
    if (self.createdGameDoc.game_type !== 'solo') {
      optinGroup(self.createdGameDoc.alpha_phone, self.gameConfig[self.storyId.toString()].alpha_wait_oip, betaOptInArray, self.gameConfig[self.storyId.toString()].beta_join_ask_oip)
    }

  },
  promiseErrorCallback('Unable to end game, either from logic based on player exit, *OR* through logic creating or updating new player docs within .createGame() function.'));

  // Log to stathat... should this be 1 or 1 for each person?
  this.app.stathatReport('Count', 'mobilecommons: create game request: success', 1);
  return true;
};

/**
 * Method for passing object data into a delegate.
 *
 * @param obj
 *   The object to apply to the 'this' value in the delegate.
 * @param delegate
 *   The function delegate.
 */
function createCallback(obj, delegate) {
  return function() {
    delegate.apply(obj, arguments);
  }
};

/**
 * Evalutes whether or not a player's story results match a given condition.
 *
 * @param condition
 *   Logic object
 * @param phone
 *   Phone number of player to check
 * @param gameDoc
 *   Document for the current game.
 * @param checkResultType
 *   What property the conditions are checking against. Either "oip" or "answer".
 *
 * @return Boolean
 */
function evaluateCondition(condition, phone, gameDoc, checkResultType) {

  /**
   * Check if the player has provided a given answer in this game.
   *
   * @param result
   *   The result to check against.
   *
   * @return Boolean
   */
  var checkUserResult = function(result) {
    for (var i = 0; i < gameDoc.story_results.length; i++) {
      if (gameDoc.story_results[i].phone == phone) {
        if (checkResultType == 'oip' && gameDoc.story_results[i].oip == result) {
          return true;
        }
        else if (checkResultType == 'answer' && gameDoc.story_results[i].answer == result) {
          return true;
        }
      }
    }

    return false;
  };

  /**
   * Recursive function to evaluate $and/$or logic objects. These objects are
   * arrays of some combination of strings (which are user answers) and more
   * logic objects.
   *
   *   ie:
   *     "$or": [string | logic object, ...]
   *     "$and": [string | logic object, ...]
   *
   * @param obj
   *   Logic object.
   *
   * @return Boolean
   */
  var evalObj = function(obj) {
    var result = false;

    if (obj['$or']) {

      var conditions = obj['$or'];
      for (var i = 0; i < conditions.length; i++) {
        // If anything is true, then result is true.
        if ((typeof conditions[i] === 'string' && checkUserResult(conditions[i])) ||
            (typeof conditions[i] === 'object' && evalObj(conditions[i]))) {
          result = true;
          break;
        }
      }

    }
    else if (obj['$and']) {

      result = true;
      var conditions = obj['$and'];
      for (var i = 0; i < conditions.length; i++) {
        // If anything is false, then result is false.
        if ((typeof conditions[i] === 'string' && !checkUserResult(conditions[i])) ||
            (typeof conditions[i] === 'object' && !evalObj(conditions[i]))) {
          result = false;
          break;
        }
      }

    }

    return result;
  };

  return evalObj(condition);
}

/**
 * @todo consider moving all of the join game behavior to a parent class SGGameController
 *
 * Joins a beta to the game she's been invited to.
 */
SGCompetitiveStoryController.prototype.betaJoinGame = function(request, response) {
  if (typeof request.body === 'undefined'
      || typeof request.body.phone === 'undefined'
      // Checking request.query.args because of the one-touch beta opt in mdata: http://goo.gl/Bh7Mxi
      || (typeof request.body.args === 'undefined' && typeof request.query.args === 'undefined')) {
    response.status(406).send('`phone` and `args` parameters required.');
    return false;
  }

  // If beta doesn't respond with 'Y', then just ignore. Checks first for .args param on request.query.

  var args;
  // Specifying both in case request.query doesn't exist. 
  if (request.query && request.query.args) {
    args = request.query.args; 
  }
  else if (request.body.args) {
    args = request.body.args;
  }

  if (!messageHelper.isYesResponse(messageHelper.getFirstWord(args))) {
    response.send();
  }
  else {
    /**
     * Callback for when beta's game is found. Update persistent storage, send
     * game-pending messages if all players haven't joined yet, or auto-start the
     * game if all players are joined.
     */
    var execBetaJoinGame = function(obj, doc) {

      // If the game's already started, notify the user and exit.
      if (doc.game_started || doc.game_ended) {
        // Good place to notify betas about ALPHA SOLO keywords for opt-in-paths. 
        optinSingleUser(obj.request.body.phone, obj.gameConfig[doc.story_id].game_in_progress_oip);
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
        doc = obj.startGame(obj.gameConfig, doc);
        obj.response.send();
      }
      // If we're still waiting on people, send appropriate messages to the recently
      // joined beta and alpha users.
      else {
        doc = obj.sendWaitMessages(obj.gameConfig, doc, obj.joiningBetaPhone);
        obj.response.send();
      }

      // Save the doc in the database with the betas and current status updates.
      obj.gameModel.update(
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

    // Object for callbacks to reference.
    var self = this;
    self.joiningBetaPhone = request.body.phone;
    self.request = request;
    self.response = response;

    // Finds the beta user's game and calls execBetaJoinGame() when found.
    this.findUserGame(self, execBetaJoinGame);
  }

  return true;
};

/**
 * Alpha chooses to start the game even without all players having joined.
 */
SGCompetitiveStoryController.prototype.alphaStartGame = function(request, response) {
  if (typeof request.body === 'undefined'
      || typeof request.body.phone === 'undefined'
      || typeof request.body.args === 'undefined') {
    response.status(406).send('`phone` and `args` parameters required.');
    return;
  }

  // If alpha doesn't respond with 'Y', then just ignore
  if (!messageHelper.isYesResponse(messageHelper.getFirstWord(request.body.args))) {
    response.send();
  }
  else {
    /**
     * Callback after alpha's game is found. Handles an alpha choosing to start
     * the game before all players have joined.
     */
    var execAlphaStartGame = function(obj, doc) {
      // Start the game.
      doc.game_started = true;
      doc = obj.startGame(obj.gameConfig, doc);
      obj.response.send();

      // Save the doc in the database with the current status updates.
      obj.gameModel.update(
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

    // Object for callbacks to reference.
    var self = this;
    self.request = request;
    self.response = response;

    // Finds the alpha user's game and calls execAlphaStartGame() when found.
    this.findUserGame(self, execAlphaStartGame);
  }
};

/**
 * Handles user's actions through the progression of a story.
 */
SGCompetitiveStoryController.prototype.userAction = function(request, response) {
  if (typeof request.body === 'undefined'
      || typeof request.body.phone === 'undefined'
      || typeof request.body.args === 'undefined') {
    response.status(406).send('`phone` and `args` parameters required.');
    return;
  }

  /**
   * Callback after user's game is found. Determines how to progress the user
   * forward in the story based on her answer.
   */
  var execUserAction = function(obj, doc) {

    // Uppercase and only get first word of user's response.
    var userFirstWord = messageHelper.getFirstWord(obj.request.body.args.toUpperCase());

    // Find player's current status.
    var userPhone = messageHelper.getNormalizedPhone(obj.request.body.phone);
    var currentOip = 0;
    for (var i = 0; i < doc.players_current_status.length; i++) {
      if (doc.players_current_status[i].phone == userPhone) {
        currentOip = doc.players_current_status[i].opt_in_path;
        break;
      }
    }

    // Get the story config.
    var storyConfig = obj.gameConfig[doc.story_id];

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
      // Note: Sort of hacky, this needs to be called before getEndLevelMessage()
      // and getUniqueIndivEndGameMessage() because they use the story_results array in the
      // game document to determine what the next message should be.
      var gameDoc = doc;
      gameDoc = obj.updateStoryResults(gameDoc, userPhone, currentOip, choiceKey);

      // Progress player to the next message.
      nextOip = storyItem.choices[choiceIndex].next;
      // Update the game document with player's current status.
      gameDoc = obj.updatePlayerCurrentStatus(gameDoc, userPhone, nextOip);

      // Player has reached the end of a level.
      if (typeof nextOip === 'string' && nextOip.match(/^END-LEVEL/)) {
        var level = nextOip;
        nextOip = obj.getEndLevelMessage(userPhone, level, storyConfig, gameDoc, 'answer');
        gameDoc = obj.updatePlayerCurrentStatus(gameDoc, userPhone, nextOip);
        gameDoc = obj.addPathToStoryResults(gameDoc, userPhone, nextOip);

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
          var groupOptin = obj.getEndLevelGroupMessage(endLevelGroupKey, storyConfig, gameDoc);
          for (var i = 0; i < gameDoc.players_current_status.length; i++) {
            var playerPhone = gameDoc.players_current_status[i].phone;  

            // Send group the end level message. The end level group message is sent 
            // SECOND of all the messages in the execUserAction() function call.

            delayedOptinSingleUser(playerPhone, groupOptin, END_LEVEL_GROUP_MESSAGE_DELAY, gameDoc._id, obj.userModel);
            gameDoc = obj.addPathToStoryResults(gameDoc, playerPhone, groupOptin);
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
                gameDoc = obj.handleGroupEndGameMessage(storyConfig, gameDoc);
              }
              gameEnded = true;
              // This is setting the next OIP to the INDIVIDUAL end-game message.
              nextPath = obj.getUniqueIndivEndGameMessage(playerPhone, storyConfig, gameDoc);
            }

            // Sends individual user the next level message.
            var optinArgs = {
              alphaPhone: playerPhone,
              alphaOptin: nextPath
            };

            // Sends individual user the next level message. The next level message
            // (or if at end-game, end-game unique individual message)
            // is sent LAST in the execUserAction() function call.
            delayedOptinSingleUser(playerPhone, nextPath, NEXT_LEVEL_START_DELAY, gameDoc._id, obj.userModel);

            gameDoc = obj.addPathToStoryResults(gameDoc, playerPhone, nextPath);

            // Update player's current status to the end game or next level message.
            gameDoc = obj.updatePlayerCurrentStatus(gameDoc, playerPhone, nextPath);
          }
        }
      }
      // If the game is over, log it to stathat.
      if (gameEnded == true) {
        gameDoc.game_ended = true;
        obj.app.stathatReport('Count', 'mobilecommons: end game: success', 1);
      }

      // Update the player's current status in the database. (Or ALL of the players' current statuses,
      // if we're at the end-level or end-game situation.)
      obj.gameModel.update(
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
      optinSingleUser(userPhone, nextOip);

      obj.response.send();
    }
    else {
      obj.response.status(500).send('Story configuration invalid.');
    }
  };

  // Object for callbacks to reference.
  var self = this;
  self.request = request;
  self.response = response;

  // Finds the user's game and calls execUserAction() when found.
  this.findUserGame(self, execUserAction);

};

/**
 * Finds a user's game.
 *
 * @param obj
 *   Reference object for callbacks.
 * @param onUserGameFound
 *   Callback to execute when the user's game is found.
 */
SGCompetitiveStoryController.prototype.findUserGame = function(obj, onUserGameFound) {

  /**
   * 4) Last callback in the chain. Called when a user's game document is found.
   */
  var onGameFound = function(err, doc) {
    if (err) {
      logger.error(err);
    }

    if (doc) {
      logger.log('debug', 'Game doc found:\n', doc);
      onUserGameFound(obj, doc);
    }
    else {
      obj.response.sendStatus(404);
    }
  };

  /**
   * 3) When a user's game is found in the mapping collection, we then know
   * which collection to search for the game on.
   */
  var onGameMappingFound = function(err, doc) {
    if (err) {
      logger.error(err);
    }

    if (doc && doc.game_model == obj.gameModel.modelName) {
      // Find the game via its id.
      obj.gameModel.findOne({_id: doc.game_id}, onGameFound);
    }
    else {
      obj.response.sendStatus(404);
    }
  };

  /**
   * 2) When a user's document is found, use the game id in the user's
   * document to then find the collection to search for the game in.
   */
  var onUserFound = function(err, doc) {
    if (err) {
      logger.error(err);
    }

    if (doc) {
      var gameId = doc.current_game_id;

      // Find the game model to determine what game collection to search over.
      obj.gameMappingModel.findOne({game_id: doc.current_game_id}, onGameMappingFound);
    }
    else {
      obj.response.sendStatus(404);
    }
  };

  /**
   * 1) First step in the process of finding the user's game - find the user document. 
   * http://mongoosejs.com/docs/queries.html
   */
  obj.userModel.findOne(
    {phone: messageHelper.getNormalizedPhone(obj.request.body.phone)},
    onUserFound
  );
};

/**
 * Updates the game document with the player's current status.
 *
 * @param gameDoc
 *   Game document to modify.
 * @param phone
 *   Phone number of the player to update.
 * @param currentPath
 *   Current opt in path that the user is on.
 *
 * @return Updated game document.
 */
SGCompetitiveStoryController.prototype.updatePlayerCurrentStatus = function(gameDoc, phone, currentPath) {
  var updated = false;
  for (var i = 0; i < gameDoc.players_current_status.length; i++) {
    if (gameDoc.players_current_status[i].phone == phone) {
      gameDoc.players_current_status[i].opt_in_path = currentPath;
      gameDoc.players_current_status[i].updated_at = Date.now();
      updated = true;
    }
  }

  if (!updated) {
    var idx = gameDoc.players_current_status.length;
    gameDoc.players_current_status[idx] = {};
    gameDoc.players_current_status[idx].phone = phone;
    gameDoc.players_current_status[idx].opt_in_path = currentPath;
    gameDoc.players_current_status[idx].updated_at = Date.now();
  }

  return gameDoc;
};

/**
 * Add to the story_results array of a game document.
 *
 * @param gameDoc
 *   Game document to modify.
 * @param phone
 *   Phone number of the player to add a result for.
 * @param oip
 *   Opt in path to add.
 *
 * @return Updated game document.
 */
SGCompetitiveStoryController.prototype.addPathToStoryResults = function(gameDoc, phone, oip) {
  var idx = gameDoc.story_results.length;
  gameDoc.story_results[idx] = {};
  gameDoc.story_results[idx].oip = oip;
  gameDoc.story_results[idx].phone = phone;
  gameDoc.story_results[idx].created_at = Date.now();

  return gameDoc;
}

/**
 * Adds a story_results item to the game document.
 *
 * @param gameDoc
 *   Game document to modify.
 * @param phone
 *   Phone number of the player to update.
 * @param oip
 *   Opt in path that the user submitted an answer for.
 * @param answer
 *   User's answer.
 *
 * @return Updated game document.
 */
SGCompetitiveStoryController.prototype.updateStoryResults = function(gameDoc, phone, oip, answer) {
  var index = gameDoc.story_results.length;

  gameDoc.story_results[index] = {};
  gameDoc.story_results[index].oip = oip;
  gameDoc.story_results[index].phone = phone;
  gameDoc.story_results[index].answer = answer;
  gameDoc.story_results[index].created_at = Date.now();

  return gameDoc;
};

/**
 * Start the game.
 *
 * @param gameConfig
 *   Config object with game story details.
 * @param gameDoc
 *   Game document for users to start the game for.
 *
 * @return Updated game document.
 */
SGCompetitiveStoryController.prototype.startGame = function(gameConfig, gameDoc) {
  // Get the starting opt in path from the game config.
  var startMessage = gameConfig[gameDoc.story_id].story_start_oip;

  // Opt in the alpha user.
  optinSingleUser(gameDoc.alpha_phone, startMessage);

  // Update the alpha's current status.
  gameDoc = this.updatePlayerCurrentStatus(gameDoc, gameDoc.alpha_phone, startMessage);

  // Alpha
  var numPlayers = 1;
  // Opt in the beta users who have joined.
  for (var i = 0; i < gameDoc.betas.length; i++) {
    if (gameDoc.betas[i].invite_accepted == true) {
      optinSingleUser(gameDoc.betas[i].phone, startMessage);

      // Update the beta's current status.
      gameDoc = this.updatePlayerCurrentStatus(gameDoc, gameDoc.betas[i].phone, startMessage);

      // 'i' is one less than the current player.
      numPlayers = i + 1;
    }
  }

  // Log for each player that has accepted the invite. 
  // 'Value' produces logs of averages, re: https://www.stathat.com/help. 
  this.app.stathatReport('Value', 'mobilecommons: number of players', numPlayers);

  // Log started game to stathat. 
  this.app.stathatReport('Count', 'mobilecommons: start game request: success', 1);
  return gameDoc;
};

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
SGCompetitiveStoryController.prototype.sendWaitMessages = function(gameConfig, gameDoc, betaPhone) {
  var alphaMessage = gameConfig[gameDoc.story_id].alpha_start_ask_oip;
  var betaMessage = gameConfig[gameDoc.story_id].beta_wait_oip;

  // Send message to alpha asking if they want to start now.
  optinSingleUser(gameDoc.alpha_phone, alphaMessage);

  // Update the alpha's current status.
  gameDoc = this.updatePlayerCurrentStatus(gameDoc, gameDoc.alpha_phone, alphaMessage);

  // Send the waiting message to the beta user.
  optinSingleUser(betaPhone, betaMessage);

  // Update the beta's current status.
  gameDoc = this.updatePlayerCurrentStatus(gameDoc, betaPhone, betaMessage);

  return gameDoc;
};

/**
 * Get the end-level opt-in path to send to a user based on the user's answers
 * and the defined criteria in the story.
 *
 * @param phone
 *   User's phone number.
 * @param level
 *   Key to find the level's config.
 * @param storyConfig
 *   Object defining details for the current story.
 * @param gameDoc
 *   Document for the current game.
 * @param checkResultType
 *   What property the conditions are checking against. Either "oip" or "answer".
 *
 * @return Boolean
 */
SGCompetitiveStoryController.prototype.getEndLevelMessage = function(phone, level, storyConfig, gameDoc, checkResultType) {
  // Get the level number from the end.
  numLevel = level.slice(-1);
  // Log which level is ending.
  this.app.stathatReport('Value', 'mobilecommons: end level : success', numLevel);
  var storyItem = storyConfig.story[level];
  if (typeof storyItem === 'undefined') {
    return null;
  }

  // Determine next opt in path based on player's choices vs conditions.
  var nextOip = null;
  for (var i = 0; i < storyItem.choices.length; i++) {
    if (evaluateCondition(storyItem.choices[i].conditions, phone, gameDoc, checkResultType)) {
      nextOip = storyItem.choices[i].next;
      break;
    }
  }

  return nextOip;
};

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
SGCompetitiveStoryController.prototype.getEndLevelGroupMessage = function(endLevelGroupKey, storyConfig, gameDoc) {

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
      if (evaluateCondition(conditions, phone, gameDoc, 'answer')) {
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
};

/**
 * Gets the unique, individual end game message for a particular user
 *
 * @param phone
 *   User's phone number.
 * @param storyConfig
 *   Object defining details for the current story.
 * @param gameDoc
 *   Document for the current game.
 *
 * @return End game individual message opt-in path
 */
SGCompetitiveStoryController.prototype.getUniqueIndivEndGameMessage = function(phone, storyConfig, gameDoc) {
  var indivMessageEndGameFormat = storyConfig['endgame_config']['indiv-message-end-game-format'];
  if (indivMessageEndGameFormat == 'individual-decision-based') {
    return this.getEndLevelMessage(phone, 'END-GAME', storyConfig, gameDoc, 'answer');
  }
  else if (indivMessageEndGameFormat == 'rankings-within-group-based') {
    return this.getIndivRankEndGameMessage(phone, storyConfig, gameDoc);
  }
  else {
    logger.error('This story has an indeterminate endgame format.');
  }
};

/**
* Calculates the ranking of all players; returns appropriate ranking oip.
* 
* @param phone
*   User's phone number.
* @param storyConfig
*   Object defining details for the current story.
* @param gameDoc
*   Document for the current game.
* 
* @return End game individual ranking opt-in-path. 
*/

SGCompetitiveStoryController.prototype.getIndivRankEndGameMessage = function(phone, storyConfig, gameDoc) {
  var gameDoc = gameDoc;
  // If we haven't run the ranking calculation before. 
  if (!gameDoc.players_current_status[0].rank) {
    var tempPlayerSuccessObject = {};
    var indivLevelSuccessOips = storyConfig.story['END-GAME']['indiv-level-success-oips'];
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
      return storyConfig.story['END-GAME']['indiv-rank-oips'][playerRanking];
    }
  }
  return false;
}

/**
 * 1) Checks the group endgame format of a game, on based on that:
 * 2) Retrieves the group endgame message,
 * 3) Sends that message to all game players,
 * 4) Updates the gamedoc's storyResults and players' current status
 * 5) Returns the updated gamedoc.
 *
 * @param storyConfig
 *   JSON object defining details for the current story.
 * @param gameDoc
 *  document for the current game
 *
 * @return The updated gamedoc.
 */
SGCompetitiveStoryController.prototype.handleGroupEndGameMessage = function(storyConfig, gameDoc) {
  if (storyConfig['endgame_config']['group-message-end-game-format'] == 'group-success-failure-based') {
    var nextPathForAllPlayers = this.getUniversalGroupEndGameMessage(storyConfig, gameDoc)
    // Iterating through all players, enrolling them in this new OIP.
    for (var j = 0; j < gameDoc.players_current_status.length; j ++) {
      var currentPlayer = gameDoc.players_current_status[j].phone;

      // If the game has ended, the universal group endgame message is
      // sent THIRD (or second-last) of all the messages in execUserAction().
      delayedOptinSingleUser(currentPlayer, nextPathForAllPlayers, UNIVERSAL_GROUP_ENDGAME_MESSAGE_DELAY, gameDoc._id, this.userModel);

      gameDoc = this.updatePlayerCurrentStatus(gameDoc, currentPlayer, nextPathForAllPlayers);
      gameDoc = this.addPathToStoryResults(gameDoc, currentPlayer, nextPathForAllPlayers);
    }
  }
  return gameDoc;
}

/**
 * Gets the universal end game message to be sent to a group.
 *
 * @param storyConfig
 *   JSON object defining details for the current story.
 * @param gameDoc
 *  document for the current game
 *
 * @return The oip of the final group message.
 */
SGCompetitiveStoryController.prototype.getUniversalGroupEndGameMessage = function(storyConfig, gameDoc) {
  // An array of oips which represent group end-level impact paths.
  var groupLevelSuccessOips = storyConfig.story['END-GAME']['group-level-success-oips'];

  // A hash. Key --> number of levels where group successfully received
  // impact condition; value --> end-level oip that number of levels unlocks,
  // which is sent to all players.
  var groupSuccessFailureOips = storyConfig.story['END-GAME']['group-success-failure-oips'];
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
};

/**
 * End a game due to a player exiting it.
 *
 * @param playerDocs
 *   Player documents for players leaving a game.
 */

SGCompetitiveStoryController.prototype._endGameFromPlayerExit = function(playerDocs) {
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
  var promise = this.gameModel.find(findCondition).exec();
  promise.then(function(docs) {

    // For each game still in progress...
    for (var i = 0; i < docs.length; i++) {

      var gameDoc = docs[i];

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
      self.gameModel.update(
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
        // Remove the current_game_id from their document.
        self.userModel.update(
          {phone: players[playerIdx]},
          {$unset: {current_game_id: 1}},
          function(err, num, raw) {
            if (err) {
              logger.error(err);
            }
          }
        );

        // Message them that the game has ended.
        optinSingleUser(players[playerIdx], self.gameConfig[gameDoc.story_id].game_ended_from_exit_oip);
      }
    }

  },
  promiseErrorCallback('Unable to end player game docs within _endGameFromPlayerExit function.'));
};

/**
 * The following two functions are for handling Mongoose Promise chain errors.
 */
function promiseErrorCallback(message) {
  return onPromiseErrorCallback.bind({message: message});
}

function onPromiseErrorCallback(err) {
  if (err) {
    logger.error(this.message + '\n', err.stack);
  }
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
function scheduleSoloMessage(gameId, gameModel, oip) {
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
    }, promiseErrorCallback('Unable to find game.'));
  };

  setTimeout(function(){ checkIfBetaJoined(gameId, gameModel, oip) }, TIME_UNTIL_SOLO_MESSAGE_SENT);
}


/**
 * Schedule a message to be sent to a SINGLE user via a Mobile Commons optin.
 *
 * @param phoneNumber
 *   The phone number of the user.
 * @param optinPath
 *   The opt in path of the message we want to send the user. 
 */
function optinSingleUser(phoneNumber, optinPath) {
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
function optinGroup(alphaPhone, alphaOptin, singleBetaPhoneOrArrayOfPhones, betaOptin) {
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
 */
function delayedOptinSingleUser(phoneNumber, optinPath, delay, currentGameId, userModel) {
  if (!phoneNumber || !optinPath || !delay || !currentGameId || !userModel) {
    return;
  }

  function sendSMS(_phoneNumber, _optinPath, _currentGameId, _userModel) {
    _userModel.findOne({phone: _phoneNumber}, function(err, userDoc) {
      if (!err) {
        // If a user's in a game that has been ended, the current_game_id property will be removed
        // from her user document. Checking to see if current_game_id still exists for that user. 
        if (userDoc.current_game_id && (userDoc.current_game_id.equals(_currentGameId))) {
          var args = {alphaPhone: _phoneNumber, alphaOptin: _optinPath};
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
  setTimeout(function() { sendSMS(phoneNumber, optinPath, currentGameId, userModel); }, delay);
}

module.exports = SGCompetitiveStoryController;
