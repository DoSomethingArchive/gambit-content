/**
 * Mongoose model for the Most Likely To SMS game.
 */

var mongoose = require('mongoose')
    , sgGameSchema = require('./sgGameSchema')()
    ;

var sgMostLikelyTo = function(app) {
  var modelName = 'sg_mostlikelyto_game';

  var schema = sgGameSchema;
  schema.add({
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
  });

  var db = mongoose.createConnection(app.get('database-uri'));
  return db.model(modelName, schema);
};

module.exports = sgMostLikelyTo;
