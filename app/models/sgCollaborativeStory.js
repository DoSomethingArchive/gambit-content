/**
 * Mongoose model for Collaborative Story SMS games.
 */
var mongoose = require('mongoose');
var sgGameSchema = require('./sgGameSchema');

var sgCollaborativeStorySchema = sgGameSchema.add({
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
})

module.exports = mongoose.model('sg_collaborativestory_game', sgCollaborativeStorySchema);
