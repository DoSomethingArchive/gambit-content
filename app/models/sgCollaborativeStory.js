/**
 * Mongoose model for Collaborative Story SMS games.
 */
var sgGameSchema = require('./sgGameSchema')()
    ;

var sgCollaborativeStory = function(app) {
  var modelName = 'sg_collaborativestory_game';

  var schema = sgGameSchema;
  // @TODO figure out how this schema's going to differ from the collaborative story
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

  return app.getModel(modelName, schema);
};

module.exports = sgCollaborativeStory;
