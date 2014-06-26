/**
 * Mongoose model for Competitive Story SMS games.
 */
var mongoose = require('mongoose')
    , sgGameSchema = require('./sgGameSchema')()
    ;

var sgCompetitiveStory = function(app) {
  var modelName = 'sg_competitivestory_game';

  var schema = sgGameSchema;
  schema.add({
    // Last Mobile Commons opt in path delivered to the alpha player
    alpha_current_opt_in_path: Number,

    // Current status of beta players
    betas_current_status: [{
      // Player's phone number
      phone: String,

      // Last Mobile Commons opt in path delivered to the player
      opt_in_path: Number
    }],

    // Defines the story the game plays through
    story: [{
      // Mobile Commons opt in path to deliver the message
      opt_in_path: Number,

      // Array of possible next scenes in the story
      choices: [{
        // Mobile Commons opt in path to go to
        opt_in_path: Number,

        // User response that maps to this choice
        answer: String
      }],

      // @TODO add fields for aggregate choice logic and pinch points
    }]
  });

  var db = mongoose.createConnection(app.get('database-uri'));
  return db.model(modelName, schema);
};

module.exports = sgCompetitiveStory;
