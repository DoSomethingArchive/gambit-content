/**
 * Game controller for the Competitive Story template.
 */

var mobilecommons = require('../../mobilecommons/mobilecommons')
  , emitter = require('../eventEmitter');
  ;

var CREATE_GAME_MIN_FRIENDS = 3;
var CREATE_GAME_MAX_FRIENDS = 3;

// Delay (in milliseconds) for end level group messages to be sent.
var END_LEVEL_GROUP_MESSAGE_DELAY = 15000;

// Delay (in milliseconds) for next level start messages to be sent.
var NEXT_LEVEL_START_DELAY = 30000;

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

  // Return a 406 if some data is missing, or there are too many friends.
  if (typeof request.body === 'undefined'
      || typeof request.body.story_id === 'undefined'
      || typeof this.gameConfig[request.body.story_id] === 'undefined'
      || typeof request.body.person === 'undefined'
      || typeof request.body.person.first_name === 'undefined'
      || typeof request.body.friends === 'undefined'
      || request.body.friends.length < CREATE_GAME_MIN_FRIENDS
      || request.body.friends.length > CREATE_GAME_MAX_FRIENDS) {
    response.send(406, request.body);
    return false;
  }

  var alphaPhone = this.getNormalizedPhone(request.body.person.phone);
  if (!this.isValidPhone(alphaPhone)) {
    response.send(406, 'Invalid alpha phone number.');
    return false;
  }

  // Compile a new game document.
  var gameDoc = {
    story_id: request.body.story_id,
    alpha_name: request.body.person.first_name,
    alpha_phone: alphaPhone,
    betas: []
  };

  for (var i = 0; i < request.body.friends.length; i++) {
    gameDoc.betas[i] = {};
    gameDoc.betas[i].invite_accepted = false;
    gameDoc.betas[i].name = request.body.friends[i].first_name;

    var phone = this.getNormalizedPhone(request.body.friends[i].phone);
    if (!this.isValidPhone(phone)) {
      response.send(406, 'Invalid beta phone number.');
      return false;
    }

    gameDoc.betas[i].phone = phone;
  }

  // Save game to the database.
  var game = this.gameModel.create(gameDoc);
  var self = this;
  game.then(function(doc) {
    emitter.emit('game-created', doc);
    var config = self.gameConfig[doc.story_id];

    // Create game id to game type mapping.
    self.gameMappingModel.create(
      {game_id: doc._id, game_model: self.gameModel.modelName},
      function(err, doc) {
        if (err) {
          console.log(err);
        }

        emitter.emit('game-mapping-created', doc);
      }
    );

    // Upsert the document for the alpha user.
    self.userModel.update(
      {phone: doc.alpha_phone},
      {$set: {
        phone: doc.alpha_phone,
        current_game_id: doc._id
      }},
      {upsert: true},
      function(err, num, raw) {
        if (err) {
          console.log(err);
        }
        else {
          emitter.emit('alpha-user-created');
          console.log(raw);
        }
      }
    );

    // Upsert documents for the beta users.
    var betaPhones = [];
    doc.betas.forEach(function(value, index, set) {
      // Extract phone number for Mobile Commons opt in.
      betaPhones[betaPhones.length] = value.phone;

      // Upsert user document for the beta.
      self.userModel.update(
        {phone: value.phone},
        {$set: {
          phone: value.phone,
          current_game_id: doc._id
        }},
        {upsert: true},
        function(err, num, raw) {
          if (err) {
            console.log(err);
          }
          else {
            emitter.emit('beta-user-created');
            console.log(raw);
          }
        }
      );
    });

    // Opt users into their appropriate paths.
    var optinArgs = {
      alphaPhone: doc.alpha_phone,
      alphaOptin: config.alpha_wait_oip,
      betaOptin: config.beta_join_ask_oip,
      betaPhone: betaPhones
    };

    self.scheduleMobileCommonsOptIn(optinArgs);
  });

  response.send(200);

  // Log to stathat... should this be 1 or 1 for each person?
  this.app.stathatReport('Count', 'mobilecommons: create game request: success', 1);
  return true;
};

/**
 * Normalizes a phone number for processing. Prepends the '1' US international
 * code to the phone number if it doesn't have it.
 *
 * @param phone
 *   Phone number to normalize.
 *
 * @return Normalized phone number string.
 */
SGCompetitiveStoryController.prototype.getNormalizedPhone = function(phone) {
  var newPhone = phone.replace(/\D/g, '');
  if (newPhone.length === 10) {
    newPhone = '1' + newPhone;
  }

  return newPhone;
}

/**
 * Checks if a phone number is valid.
 *
 * @param phone
 *   Phone number to check.
 *
 * @return true if valid. false, otherwise.
 */
SGCompetitiveStoryController.prototype.isValidPhone = function(phone) {
  if (phone.length === 11) {
    return true;
  }
  else {
    return false;
  }
};

/**
 * Method for passing object data into a delegate.
 *
 * @param obj
 *   The object to apply to the 'this' value in the delegate.
 * @param delegate
 *   The function delegate.
 */
function createCallback(obj, delegate)
{
  return function() {
    delegate.apply(obj, arguments);
  }
};

/**
 * @todo consider moving all of the join game behavior to a parent class SGGameController
 *
 * Joins a beta to the game she's been invited to.
 */
SGCompetitiveStoryController.prototype.betaJoinGame = function(request, response) {
  if (typeof request.body === 'undefined'
      || typeof request.body.phone === 'undefined'
      || typeof request.body.args === 'undefined') {
    response.send(406, '`phone` and `args` parameters required.');
    return false;
  }

  // If beta doesn't respond with 'Y', then just ignore
  if (request.body.args.toUpperCase() !== 'Y') {
    response.send();
  }
  else {
    /**
     * Callback for when beta's game is found. Update persistent storage, send
     * game-pending messages if all player haven't joined yet, or auto-start the
     * game if all players are joined.
     */
    var execBetaJoinGame = function(obj, doc) {

      // If the game's already started, notify the user and exit.
      if (doc.game_started) {
        var args = {
          alphaPhone: obj.request.body.phone,
          alphaOptin: obj.gameConfig[doc.story_id].game_in_progress_oip
        };

        obj.scheduleMobileCommonsOptIn(args);
        obj.response.send(200);
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
        obj.response.send(200);
      }
      // If we're still waiting on people, send appropriate messages to the recently
      // joined beta and alpha users.
      else {
        console.log('Waiting on ' + numWaitingOn + ' people to join.');

        doc = obj.sendWaitMessages(obj.gameConfig, doc, obj.joiningBetaPhone);
        obj.response.send(200);
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
            console.log(err);
          }
          else {
            emitter.emit('game-updated');
            console.log(raw);
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
    response.send(406, '`phone` and `args` parameters required.');
    return;
  }

  // If alpha doesn't respond with 'Y', then just ignore
  if (request.body.args.toUpperCase() !== 'Y') {
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
      obj.response.send(200);

      // Save the doc in the database with the current status updates.
      obj.gameModel.update(
        {_id: doc._id},
        {$set: {
          players_current_status: doc.players_current_status,
          game_started: doc.game_started
        }},
        function(err, num, raw) {
          if (err) {
            console.log(err);
          }
          else {
            emitter.emit('game-updated');
            console.log(raw);
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
    response.send(406, '`phone` and `args` parameters required.');
    return;
  }

  /**
   * Callback after user's game is found. Determines how to progress the user
   * forward in the story based on her answer.
   */
  var execUserAction = function(obj, doc) {

    // Uppercase, trim and only get first word of user's response.
    var userArgs = obj.request.body.args.toUpperCase().trim();
    var userFirstWord = userArgs;
    if (userArgs.indexOf(' ') >= 0) {
      userFirstWord = userArgs.substr(0, userArgs.indexOf(' '));
    }

    // Find player's current status.
    var userPhone = obj.getNormalizedPhone(obj.request.body.phone);
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
      // Save the first answer in the valid_answers array to the database.
      var answerToSave = storyItem.choices[choiceIndex].valid_answers[0];

      // Update the results of the player's progression through a story.
      // Note: Sort of hacky, this needs to be called before getEndLevelMessage()
      // and getEndGameMessage() because they use the story_results array in the
      // game document to determine what the next message should be.
      var gameDoc = doc;
      gameDoc = obj.updateStoryResults(gameDoc, userPhone, currentOip, answerToSave);

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
          if (gameDoc.players_current_status[i].phone == userPhone)
            continue;

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

            // Send group the end level message.
            var endLevelGroupArgs = {
              alphaPhone: playerPhone,
              alphaOptin: groupOptin
            };

            obj.scheduleMobileCommonsOptIn(endLevelGroupArgs, END_LEVEL_GROUP_MESSAGE_DELAY);
            gameDoc = obj.addPathToStoryResults(gameDoc, playerPhone, groupOptin);
          }

          // Note: Doing this for loop separately from the end-level message so
          // that results for all players can be updated before figuring out the
          // next message.
          // Send group the next level message
          var gameEnded = false;
          var nextLevel = storyConfig.story[endLevelGroupKey].next_level;
          for (var i = 0; i < gameDoc.players_current_status.length; i++) {
            var playerPhone = gameDoc.players_current_status[i].phone;
            var nextPath = nextLevel;
            // End game message needs to be determined per player
            if (nextLevel == 'END-GAME') {
              gameEnded = true;
              nextPath = obj.getEndGameMessage(playerPhone, storyConfig, gameDoc);
            }

            // Send group the next level message.
            var optinArgs = {
              alphaPhone: playerPhone,
              alphaOptin: nextPath
            };

            obj.scheduleMobileCommonsOptIn(optinArgs, NEXT_LEVEL_START_DELAY);
            gameDoc = obj.addPathToStoryResults(gameDoc, playerPhone, nextPath);

            // Update player's current status to the end game or next level message.
            gameDoc = obj.updatePlayerCurrentStatus(gameDoc, playerPhone, nextPath);
          }
        }
      }
      // If the game is over, log it to stathat.
      if (gameEnded == true) {
        obj.app.stathatReport('Count', 'mobilecommons: end game: success', 1);
      }

      // Update the player's current status in the database.
      obj.gameModel.update(
        {_id: doc._id},
        {$set: {
          players_current_status: gameDoc.players_current_status,
          story_results: gameDoc.story_results
        }},
        function(err, num, raw) {
          if (err) {
            console.log(err);
          }
          else {
            console.log(raw);
          }
        }
      );
    }
    else {
      // Resend the same message by opting into the current path again.
      nextOip = currentOip;
    }

    // Send next immediate message via Mobile Commons opt in.
    if (userPhone && nextOip) {
      var optinArgs = {
        alphaPhone: userPhone,
        alphaOptin: nextOip,
      };

      obj.scheduleMobileCommonsOptIn(optinArgs);

      obj.response.send(200);
    }
    else {
      obj.response.send(500, 'Story configuration invalid.');
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
      console.log(err);
    }

    if (doc) {
      onUserGameFound(obj, doc);
    }
    else {
      obj.response.send(404);
    }
  };

  /**
   * 3) When a user's game is found in the mapping collection, we then know
   * which collection to search for the game on.
   */
  var onGameMappingFound = function(err, doc) {
    if (err) {
      console.log(err);
    }

    if (doc && doc.game_model == obj.gameModel.modelName) {
      // Find the game via its id.
      obj.gameModel.findOne({_id: doc.game_id}, onGameFound);
    }
    else {
      obj.response.send(404);
    }
  };

  /**
   * 2) When a user's document is found, use the game id in the user's
   * document to then find the collection to search for the game in.
   */
  var onUserFound = function(err, doc) {
    if (err) {
      console.log(err);
    }

    if (doc) {
      var gameId = doc.current_game_id;

      // Find the game model to determine what game collection to search over.
      obj.gameMappingModel.findOne({game_id: doc.current_game_id}, onGameMappingFound);
    }
    else {
      obj.response.send(404);
    }
  };

  /**
   * 1) First step in the process of finding the user's game - find the user document.
   */
  obj.userModel.findOne(
    {phone: this.getNormalizedPhone(obj.request.body.phone)},
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
      updated = true;
    }
  }

  if (!updated) {
    var idx = gameDoc.players_current_status.length;
    gameDoc.players_current_status[idx] = {};
    gameDoc.players_current_status[idx].phone = phone;
    gameDoc.players_current_status[idx].opt_in_path = currentPath;
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
  var alphaArgs = {
    alphaPhone: gameDoc.alpha_phone,
    alphaOptin: startMessage,
  };

  this.scheduleMobileCommonsOptIn(alphaArgs);

  // Update the alpha's current status.
  gameDoc = this.updatePlayerCurrentStatus(gameDoc, gameDoc.alpha_phone, startMessage);

  // Opt in the beta users who have joined.
  for (var i = 0; i < gameDoc.betas.length; i++) {
    if (gameDoc.betas[i].invite_accepted == true) {
      var betaArgs = {
        alphaPhone: gameDoc.betas[i].phone,
        alphaOptin: startMessage
      };

      this.scheduleMobileCommonsOptIn(betaArgs);

      // Update the beta's current status.
      gameDoc = this.updatePlayerCurrentStatus(gameDoc, gameDoc.betas[i].phone, startMessage);

      // 'i' is one less than the current player + you need to add the alpha.
      var numPlayers = i + 1 + 1;
      // Log for each player that has accepted the invite.
      this.app.stathatReport('Value', 'mobilecommons: number of players', numPlayers);
    }
  }

  // Log started gamed to stathat.
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
  var alphaArgs = {
    alphaPhone: gameDoc.alpha_phone,
    alphaOptin: alphaMessage
  };

  this.scheduleMobileCommonsOptIn(alphaArgs);

  // Update the alpha's current status.
  gameDoc = this.updatePlayerCurrentStatus(gameDoc, gameDoc.alpha_phone, alphaMessage);

  // Send the waiting message to the beta user.
  var betaArgs = {
    alphaPhone: betaPhone,
    alphaOptin: betaMessage
  };

  this.scheduleMobileCommonsOptIn(betaArgs);

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

  // Determine next opt in path based on player's choices vs conditions.
  var nextOip = null;
  for (var i = 0; i < storyItem.choices.length; i++) {
    if (evalObj(storyItem.choices[i].conditions)) {
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
  // Figure out what the majority end-level result was for all players.
  var playerResults = {};
  for (var i = 0; i < gameDoc.players_current_status.length; i++) {
    var oip = gameDoc.players_current_status[i].opt_in_path;
    if (playerResults[oip]) {
      playerResults[oip]++;
    }
    else {
      playerResults[oip] = 1;
    }
  }

  var storyItem = storyConfig.story[endLevelGroupKey];

  /**
   * Determine if path1 is listed before path2 in the array of END-LEVEL*-GROUP choices.
   */
  var isHigherPriorityPath = function(path1, path2) {
    for (var i = 0; i < storyItem.choices.length; i++) {
      if (storyItem.choices[i].next == path1)
        return true;
      else if (storyItem.choices[i].next == path2)
        return false;
    }

    return true;
  };

  var majorityResult = 0;
  var maxCount = 0;
  var keys = Object.keys(playerResults);
  for (var i = 0; i < keys.length; i++) {
    // Set new majority if count is higher or path is higher priority
    var countIsGreater = playerResults[keys[i]] > maxCount;
    var isHigherPriority = playerResults[keys[i]] == maxCount && isHigherPriorityPath(keys[i], majorityResult);
    if (countIsGreater || isHigherPriority) {
      majorityResult = keys[i];
    }
  }

  // Return the end level group message based on majority found.
  for (var i = 0; i < storyItem.choices.length; i++) {
    if (storyItem.choices[i].majority_players_result == 'DEFAULT') {
      return storyItem.choices[i].next;
    }
    else if (storyItem.choices[i].majority_players_result == majorityResult) {
      return storyItem.choices[i].next;
    }
  }

  return null;
};

/**
 * Gets the end game message for a user
 *
 * @param phone
 *   User's phone number.
 * @param storyConfig
 *   Object defining details for the current story.
 * @param gameDoc
 *   Document for the current game.
 *
 * @return End game opt-in path
 */
SGCompetitiveStoryController.prototype.getEndGameMessage = function(phone, storyConfig, gameDoc) {
  // END-GAME scenario uses the same logic as end-level messages.
  return this.getEndLevelMessage(phone, 'END-GAME', storyConfig, gameDoc, 'answer');
};

/**
 * Schedule a message to be sent via a Mobile Commons opt in.
 *
 * @param args
 *   The opt-in args needed for the call to mobilecommons.optin()
 * @param delay
 *   Time in millisecons to delay the message. Defaults to 0 if not set.
 */
SGCompetitiveStoryController.prototype.scheduleMobileCommonsOptIn = function(args, delay) {
  if (!delay) {
    delay = 0;
  }

  setTimeout(function() {
    // Skip the actual Mobile Commons opt-in in test mode.
    if (process.env.NODE_ENV == 'test') {
      return;
    }

    mobilecommons.optin(args);
  }, delay);
}

module.exports = SGCompetitiveStoryController;
