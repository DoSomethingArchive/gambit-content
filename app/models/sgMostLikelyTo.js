/**
 * Mongoose model for the Most Likely To SMS game.
 */
var mongoose = require('mongoose');
var sgGameSchema = require('./sgGameSchema');

var sgMostLikelyToSchema = sgGameSchema.add({
  // Array of questions the game progresses through
  questions: [{

    // Mobile Commons opt-in path of the question
    opt_in_path: Number,

    // Alpha user's answer to the question
    alpha_answer: String,

    beta_answers: [{
      // Phone number of the beta user
      phone: String,

      // Beta user's answer
      answer: String
    }]
  }]
})

module.exports = mongoose.model('sg_mostlikelyto_game', sgMostLikelyToSchema);