/**
 * Game controller for the Competitive Story template.
 */

var smsHelper = rootRequire('app/lib/smsHelpers')
  , emitter = rootRequire('app/eventEmitter')
  , logger = rootRequire('app/lib/logger')
  , gameMappingModel = require('../models/sgGameMapping')
  , gameModel = require('../models/sgCompetitiveStory')
  , userModel = require('../models/sgUser')
  , gameConfig = require('../config/competitive-stories')
  , message = require('./gameMessageHelpers')
  , utility = require('./gameUtilities')
  , record = require('./gameRecordHelpers')
  , userActionLogic = require('./logicUserAction')
  , betaJoinLogic = require('./logicBetaJoin')
  , alphaStartLogic = require('./logicAlphaStart')
  , start = require('./logicGameStart')
  ;

// Maximum number of players that can be invited into a game.
var MAX_PLAYERS_TO_INVITE = 3
// Minimum number of players required to create and/or start a game.
  , MIN_PLAYERS_TO_INVITE = 0
// The time interval between when a multiplayer game is created and when the SOLO option message is sent to the alpha.
  , TIME_UNTIL_SOLO_MESSAGE_SENT = 300000 // Five minutes is 300000.
// StatHat analytics marker. 
  , STATHAT_CATEGORY = 'sms-games'
  ;

var SGCompetitiveStoryController = function() {};

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
  // helper function.
  this.request = request;
  this.response = response;
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

  if (typeof gameConfig[this.storyId] === 'undefined') {
    response.status(406).send('Game config not setup for story ID: ' + this.storyId);
    return false;
  }

  var alphaPhone = smsHelper.getNormalizedPhone(request.body.alpha_mobile);
  if (!smsHelper.isValidPhone(alphaPhone)) {
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
      var phone = smsHelper.getNormalizedPhone(request.body['beta_mobile_' + i]);
      if (smsHelper.isValidPhone(phone)) {
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
  var game = gameModel.create(gameDoc);
  game.then(function(doc) {
    emitter.emit('game-created', doc);
    var config = gameConfig[doc.story_id];

    // doc.story_id check added in order to A/B test auto-start functionality. 
    if (doc.game_type != "solo" && doc.story_id == 201) {
    // Automatically starts game after specified delay, or opts alpha into solo play.
      start.auto(doc._id);
    }
    else {
      // Sets a time to ask the alpha if she wants to play a solo game.
      message.giveSoloOptionAfterDelay(doc._id, gameModel, gameConfig[self.storyId].ask_solo_play, TIME_UNTIL_SOLO_MESSAGE_SENT);
    }
  
    // Create game id to game type mapping.
    gameMappingModel.create(
      {game_id: doc._id, game_model: gameModel.modelName},
      function(err, doc) {
        if (err) {
          logger.error(err);
        }
        emitter.emit('game-mapping-created', doc);
      }
    );

    // Build the condition to find existing user documents for all invited players.
    var alphaPhone = smsHelper.getNormalizedPhone(doc.alpha_phone);
    var findCondition = {$or: [{phone: alphaPhone}]};
    for (var i = 0; i < doc.betas.length; i++) {
      var betaPhone = smsHelper.getNormalizedPhone(doc.betas[i].phone);
      findCondition['$or'][i+1] = {phone: betaPhone};
    }
    // Allowing us to use the created saved doc in the function called with the promise. 
    self.createdGameDoc = doc;

    return userModel.find(findCondition).exec();
  },
  utility.promiseErrorCallback('Unable to create player game docs within .createGame() function.')).then(function(playerDocs) {

    // End games that these players were previously in.
    message.endGameFromPlayerExit(playerDocs);

    // Upsert the document for the alpha user.
    // This response.sendStatus() call fires after the async Mongoose call returns
    // so that upon SOLO game creation, the Alpha userModel will have been modified 
    // with the SOLO gameId before the start game logic runs 
    // (triggered by the POST to the /alpha-start route.)
    createPlayer(self.createdGameDoc.alpha_phone, self.createdGameDoc._id, 'alpha-user-created', function(){ self.response.sendStatus(201); });

    // Upsert user documents for the betas.
    self.createdGameDoc.betas.forEach(function(value, index, set) {
      createPlayer(value.phone, self.createdGameDoc._id, 'beta-user-created');
    });

    var betaOptInArray = []; // Extract phone number for Mobile Commons opt in.
    self.createdGameDoc.betas.forEach(function(value, index, set) {
      betaOptInArray[betaOptInArray.length] = value.phone;
    })

    // We opt users into these initial opt in paths only if the game type is NOT solo. 
    if (self.createdGameDoc.game_type !== 'solo') {
      message.group(self.createdGameDoc.alpha_phone,
        gameConfig[self.storyId.toString()].alpha_wait_oip,
        betaOptInArray,
        gameConfig[self.storyId.toString()].beta_join_ask_oip);
    }

  },
  utility.promiseErrorCallback('Unable to end game, either from logic based on player exit, *OR* through logic creating or updating new player docs within .createGame() function.'));

  // Report create game stats to StatHat
  var stathatAction = 'create game';
  var numPlayers = gameDoc && gameDoc.betas ? gameDoc.betas.length + 1 : 1;
  utility.stathatReportValue(STATHAT_CATEGORY, stathatAction, 'number of players (avg)', this.storyId, numPlayers);
  utility.stathatReportCount(STATHAT_CATEGORY, stathatAction, 'number of players (total)', this.storyId, numPlayers);
  utility.stathatReportCount(STATHAT_CATEGORY, stathatAction, 'success', this.storyId, 1);
  return true;

  function createPlayer(phone, docId, emitterMessage, onSuccess) {
    userModel.update(
      {phone: phone},
      {$set: {phone: phone, current_game_id: docId, updated_at: Date.now()}},     
      {upsert: true}
    ).exec().then(function(num, raw) {
      emitter.emit(emitterMessage);
      if (raw && raw.upserted) {
        logger.info(emitterMessage, JSON.stringify(raw.upserted));
      }
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
    }, utility.promiseErrorCallback('Unable to create player, this event did not happen: ' + emitterMessage)
    )
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

  if (!smsHelper.isYesResponse(smsHelper.getFirstWord(args))) {
    response.send();
  }
  else {
    // Object for callbacks to reference.
    var self = this;
    self.request = request;
    self.response = response;

    // Finds the beta user's game and calls execBetaJoinGame() when found.
    this.findUserGame(self, betaJoinLogic);
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
  if (!smsHelper.isYesResponse(smsHelper.getFirstWord(request.body.args))) {
    response.send();
  }
  else {
    // Object for callbacks to reference.
    var self = this;
    self.request = request;
    self.response = response;

    // Finds the alpha user's game and calls execAlphaStartGame() when found.
    this.findUserGame(self, alphaStartLogic);
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

  // Object for callbacks to reference.
  var self = this;
  self.request = request;
  self.response = response;

  // Finds the user's game and calls execUserAction() when found.
  this.findUserGame(self, userActionLogic);

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
   * 1) First step in the process of finding the user's game - find the user document. 
   * http://mongoosejs.com/docs/queries.html
   */
  userModel.findOne(
    {phone: smsHelper.getNormalizedPhone(obj.request.body.phone)},
    onUserFound
  );

  /**
   * 2) When a user's document is found, use the game id in the user's
   * document to then find the collection to search for the game in.
   */
  function onUserFound(err, doc) {
    if (err) {
      logger.error(err);
    }

    if (doc) {
      var gameId = doc.current_game_id;

      // Find the game model to determine what game collection to search over.
      gameMappingModel.findOne({game_id: doc.current_game_id}, onGameMappingFound);
    }
    else {
      obj.response.sendStatus(404);
    }
  };

  /**
   * 3) When a user's game is found in the mapping collection, we then know
   * which collection to search for the game on.
   */
  function onGameMappingFound(err, doc) {
    if (err) {
      logger.error(err);
    }

    if (doc && doc.game_model == gameModel.modelName) {
      // Find the game via its id.
      gameModel.findOne({_id: doc.game_id}, onGameFound);
    }
    else {
      obj.response.sendStatus(404);
    }
  };

  /**
   * 4) Last callback in the chain. Called when a user's game document is found.
   */
  function onGameFound(err, doc) {
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
};

module.exports = SGCompetitiveStoryController;
