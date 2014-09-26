/**
 * Mongoose model for Competitive Story SMS games.
 */
var sgGameSchema = require('./sgGameSchema')()
    ;

var sgCompetitiveStory = function(app) {
  var modelName = 'sg_competitivestory_game';

  var schema = sgGameSchema;
  schema.add({
    // Current status of players
    players_current_status: [{
      // Player's phone number
      phone: String,

      // Last Mobile Commons opt in path delivered to the player
      opt_in_path: Number,

      // Player's rank, relevant for a ranked game
      rank: {type: String, default: ''}
    }],

    // Tracks the results of the story as it gets played out
    story_results: [{
      // Mobile Commons opt in path that the user played.
      oip: Number,

      // Phone number of the player this result is for.
      phone: String,

      // The answer given by the user.
      answer: String
    }],

    // Whether or not game has started
    game_started: {type: Boolean, default: false},

    // Whether or not game has ended
    game_ended: {type: Boolean, default: false},

    // The type of game. Currently unassigned if type is default multiplayer.
    // Assigned if game type is SOLO; or one player. 
    game_type: {type: String, default: ''}

  });

  return app.getModel(modelName, schema);
};

module.exports = sgCompetitiveStory;
