/**
 * Model for the tips configuration document. Each object corresponds to one section of 
 * the campaign tips flow, for instance: "Birthday Mail 2014 - KNOW". 
 */
var mongoose = require('mongoose');

var competitiveStoriesConfigSchema = new mongoose.Schema({

  // Reassigning the _id value to our own self-determined competitive story config id. 
  _id : Number,

  // Contextual information about the game. 
  __comments: String,

  // OIP for the alpha user to 
  alpha_wait_oip: Number,

  alpha_start_ask_oip: Number,

  beta_join_ask_oip: Number,

  beta_wait_oip: Number,

  game_in_progress_oip: Number, 

  game_ended_from_exit_oip: Number,

  story_start_oip: Number,

  ask_solo_play : Number,

  mobile_create: {

    ask_beta_1_oip: Number,

    ask_beta_2_oip: Number, 

    invalid_mobile_oip: Number,

    not_enough_players_oip: Number,

  },

  endgame_config: {

    indiv-message-end-game-format : Number,

    group-message-end-game-format : Number

  },

  story: Schema.Types.Mixed

})

module.exports = function(connection) {
  return connection.model('competitive_stories_config', competitiveStoriesConfigSchema);
}