/**
 * Mongoose model for Competitive Story SMS games.
 */
var mongoose = require('mongoose');
var sgGameSchema = require('./sgGameSchema');

sgGameSchema.add({
  // Current status of players
  players_current_status: [{
    // Player's phone number
    phone: String,

    // Last Mobile Commons opt in path delivered to the player
    opt_in_path: Number,

    // Player's rank, relevant for a ranked game
    rank: {type: String, default: ''},

    // Timestamp. 
    updated_at: {type: Date, default: Date.now}

  }],

  // Tracks the results of the story as it gets played out
  story_results: [{
    // Mobile Commons opt in path that the user played.
    oip: Number,  

    // Phone number of the player this result is for.
    phone: String,

    // The answer given by the user.
    answer: String,

    // Timestamp. 
    created_at: {type: Date, default: Date.now}

  }],

  // Whether or not game has started
  game_started: {type: Boolean, default: false},

  // Whether or not game has ended
  game_ended: {type: Boolean, default: false},

  // The type of game. Currently unassigned if type is default multiplayer.
  // Assigned if game type is SOLO; or one player. 
  game_type: {type: String, default: ''},

  // Timestamp. 
  created_at: {type: Date, default: Date.now}
});

var sgCompetitiveStorySchema = sgGameSchema;

module.exports = mongoose.model('sg_competitivestory_game', sgCompetitiveStorySchema)