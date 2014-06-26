/**
 * Game controller for the Competitive Story template.
 */

var CREATE_GAME_MIN_FRIENDS = 3;
var CREATE_GAME_MAX_FRIENDS = 3;

var SGCompetitiveStoryController = function(app) {
  this.app = app;
  this.gameModel = require('../models/sgCompetitiveStory')(app);
  this.userModel = require('../models/sgUser')(app);
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
    // Upsert the document for the alpha user.
    self.userModel.update(
      {phone: doc.alpha_phone},
      {$set: {
        phone: doc.alpha_phone,
        current_game_id: doc._id
      }},
      {upsert: true},
      function(err, num, raw) {
        console.log(raw);
      }
    );

    // Upsert documents for the beta users.
    doc.betas.forEach(function(value, index, set) {
      self.userModel.update(
        {phone: value.phone},
        {$set: {
          phone: value.phone,
          current_game_id: doc._id
        }},
        {upsert: true},
        function(err, num, raw) {
          console.log(raw);
        }
      );
    });
  });

  response.send(202);

};

module.exports = SGCompetitiveStoryController;
