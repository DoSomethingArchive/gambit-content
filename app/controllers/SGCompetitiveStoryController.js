/**
 * Game controller for the Competitive Story template.
 */

var mobilecommons = require('../../mobilecommons/mobilecommons')
  ;

var CREATE_GAME_MIN_FRIENDS = 3;
var CREATE_GAME_MAX_FRIENDS = 3;

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
      || typeof request.body.phone === 'undefined') {
    response.send(406, '`phone` parameter required.')
  }

  var self = this;
  self.response = response;

  // Find the user's document to get the game id.
  this.userModel.findOne(
    {phone: request.body.phone},
    createCallback(self, this.onInvitedBetaFound)
  );
};

/**
 * Callback when an invited beta's document is found. Use the game id in the beta's
 * document to then find the collection to search for the game in.
 */
SGCompetitiveStoryController.prototype.onInvitedBetaFound = function(err, doc) {
  if (err) {
    console.log(err);
  }

  if (doc) {
    var gameId = doc.current_game_id;

    // Find the game model to determine what game collection to search over.
    this.gameMappingModel.findOne(
      {game_id: doc.current_game_id},
      createCallback(this, this.onInvitedBetaGameMappingFound)
    );
  }
  else {
    this.response.send(404);
  }
};

/**
 * Callback when an invited beta's game is found in the mapping collection. This
 * then tells us when collection to search for the game on.
 */
SGCompetitiveStoryController.prototype.onInvitedBetaGameMappingFound = function(err, doc) {
  if (err) {
    console.log(err);
  }

  if (doc && doc.game_model == this.gameModel.modelName) {
    // Find the game via its id.
    this.gameModel.findOne(
      {_id: doc.game_id},
      createCallback(this, this.onInvitedBetaGameFound)
    );
  }
  else {
    this.response.send(404);
  }
};

/**
 * Callback when an invited beta's game document is found.
 */
SGCompetitiveStoryController.prototype.onInvitedBetaGameFound = function(err, doc) {
  if (err) {
    console.log(err);
  }

  this.response.send(doc);
  // @todo update to this beta's object.invite_accepted = true
  // @todo if all betas invite_accepted = true, then auto-start the game
  // @todo else, send appropriate messages to alpha and the recently-joined beta
};

/**
 * @todo
 */
SGCompetitiveStoryController.prototype.alphaStartGame = function(request,response) {
  response.send('TODO: implement SGCompetitiveStoryController.onAlphaStartGame');
};

module.exports = SGCompetitiveStoryController;
