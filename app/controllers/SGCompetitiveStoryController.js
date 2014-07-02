/**
 * Game controller for the Competitive Story template.
 */

var mobilecommons = require('../../mobilecommons/mobilecommons')
  ;

var CREATE_GAME_MIN_FRIENDS = 3;
var CREATE_GAME_MAX_FRIENDS = 3;

// Values assigned to requests so we know how to handle them when they reach
// the end of a chain of callbacks that find the relevant game document.
var RequestType = {
  ALPHA_START: 'alpha-start',
  BETA_JOIN: 'beta-join'
};

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
    return;
  }

  // Compile a new game document.
  var gameDoc = {
    story_id: request.body.story_id,
    alpha_name: request.body.person.first_name,
    alpha_phone: request.body.person.phone,
    betas: []
  };

  request.body.friends.forEach(function(value, index, set) {
    gameDoc.betas[index] = {};
    gameDoc.betas[index].invite_accepted = false;
    gameDoc.betas[index].name = value.first_name;
    gameDoc.betas[index].phone = value.phone;
  });

  // Save game to the database.
  var game = this.gameModel.create(gameDoc);

  var self = this;
  game.then(function(doc) {
    var config = self.gameConfig[doc.story_id];

    // Create game id to game type mapping.
    self.gameMappingModel.create(
      {game_id: doc._id, game_model: self.gameModel.modelName},
      function(err, doc) {
        if (err) {
          console.log(err);
        }
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

    mobilecommons.optin(optinArgs);
  });

  response.send(202);

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
  }

  // If beta doesn't respond with 'Y', then just ignore
  if (request.body.args.toUpperCase() !== 'Y') {
    response.send();
  }
  else {
    // Create object for callbacks to refer to for data on the request.
    var self = this;
    self.joiningBetaPhone = request.body.phone;
    self.response = response;
    self.requestType = RequestType.BETA_JOIN;

    // Find the user's document to get the game id.
    this.userModel.findOne(
      {phone: request.body.phone},
      createCallback(self, this.onUserFound)
    );
  }
};

/**
 * Alpha chooses to start the game even without all players having joined.
 */
SGCompetitiveStoryController.prototype.alphaStartGame = function(request, response) {
  if (typeof request.body === 'undefined'
      || typeof request.body.phone === 'undefined'
      || typeof request.body.args === 'undefined') {
    response.send(406, '`phone` and `args` parameters required.');
  }

  // If alpha doesn't respond with 'Y', then just ignore
  if (request.body.args.toUpperCase() !== 'Y') {
    response.send();
  }
  else {
    // Create object for callbacks to refer to for data on the request.
    var self = this;
    self.requestType = RequestType.ALPHA_START;
    self.response = response;

    // Find the user's document to get the game id.
    this.userModel.findOne(
      {phone: request.body.phone},
      createCallback(self, this.onUserFound)
    );
  }
};

/**
 * Callback when a user's document is found. Use the game id in the user's
 * document to then find the collection to search for the game in.
 */
SGCompetitiveStoryController.prototype.onUserFound = function(err, doc) {
  if (err) {
    console.log(err);
  }

  if (doc) {
    var gameId = doc.current_game_id;

    // Find the game model to determine what game collection to search over.
    this.gameMappingModel.findOne(
      {game_id: doc.current_game_id},
      createCallback(this, this.onGameMappingFound)
    );
  }
  else {
    this.response.send(404);
  }
};

/**
 * Callback when a user's game is found in the mapping collection. This
 * then tells us which collection to search for the game on.
 */
SGCompetitiveStoryController.prototype.onGameMappingFound = function(err, doc) {
  if (err) {
    console.log(err);
  }

  if (doc && doc.game_model == this.gameModel.modelName) {
    // Find the game via its id.
    this.gameModel.findOne(
      {_id: doc.game_id},
      createCallback(this, this.onGameFound)
    );
  }
  else {
    this.response.send(404);
  }
};

/**
 * Callback when a user's game document is found.
 */
SGCompetitiveStoryController.prototype.onGameFound = function(err, doc) {
  if (err) {
    console.log(err);
  }

  if (doc) {
    // Now that we have the game document, handle the request based on its type.
    if (this.requestType == RequestType.ALPHA_START) {
      this.execAlphaStartGame(doc);
    }
    else if (this.requestType == RequestType.BETA_JOIN) {
      this.execBetaJoinGame(doc);
    }
  }
  else {
    this.response.send(404);
  }
};

/**
 * Updates the game document with the player's current status.
 *
 * @param gameDoc
 *   Game document for users to start the game for.
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

  mobilecommons.optin(alphaArgs);

  // Update the alpha's current status.
  gameDoc = this.updatePlayerCurrentStatus(gameDoc, gameDoc.alpha_phone, startMessage);

  // Opt in the beta users who have joined.
  for (var i = 0; i < gameDoc.betas.length; i++) {
    if (gameDoc.betas[i].invite_accepted == true) {
      var betaArgs = {
        alphaPhone: gameDoc.betas[i].phone,
        alphaOptin: startMessage
      };

      mobilecommons.optin(betaArgs);

      // Update the beta's current status.
      gameDoc = this.updatePlayerCurrentStatus(gameDoc, gameDoc.betas[i].phone, startMessage);
    }
  }

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

  mobilecommons.optin(alphaArgs);

  // Update the alpha's current status.
  gameDoc = this.updatePlayerCurrentStatus(gameDoc, gameDoc.alpha_phone, alphaMessage);

  // Send the waiting message to the beta user.
  var betaArgs = {
    alphaPhone: betaPhone,
    alphaOptin: betaMessage
  };

  mobilecommons.optin(betaArgs);

  // Update the beta's current status.
  gameDoc = this.updatePlayerCurrentStatus(gameDoc, betaPhone, betaMessage);

  return gameDoc;
};

/**
 * Handles a beta joining the game. Update persistent storage, send
 * game-pending messages if all player haven't joined yet, or auto-start the game
 * if all players are joined.
 *
 * @param doc
 *   The game document of the game the beta's joining.
 */
SGCompetitiveStoryController.prototype.execBetaJoinGame = function(doc) {
  // Update game doc marking this beta as having joined the game
  for (var i = 0; i < doc.betas.length; i++) {
    if (doc.betas[i].phone == this.joiningBetaPhone) {
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
    doc = this.startGame(this.gameConfig, doc);
    this.response.send(202);
  }
  // If we're still waiting on people, send appropriate messages to the recently
  // joined beta and alpha users.
  else {
    console.log('Waiting on ' + numWaitingOn + ' people to join.');

    doc = this.sendWaitMessages(this.gameConfig, doc, this.joiningBetaPhone);
    this.response.send(202);
  }

  // Save the doc in the database with the betas and current status updates.
  this.gameModel.update(
    {_id: doc._id},
    {$set: {
      betas: doc.betas,
      players_current_status: doc.players_current_status
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
};

/**
 * Handles an alpha choosing to start the game before all players have joined.
 *
 * @param doc
 *   The game document of the game the alpha is starting.
 */
SGCompetitiveStoryController.prototype.execAlphaStartGame = function(doc) {
  // Start the game.
  doc = this.startGame(this.gameConfig, doc);
  this.response.send(202);

  // Save the doc in the database with the current status updates.
  this.gameModel.update(
    {_id: doc._id},
    {$set: {
      players_current_status: doc.players_current_status
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
};

module.exports = SGCompetitiveStoryController;
