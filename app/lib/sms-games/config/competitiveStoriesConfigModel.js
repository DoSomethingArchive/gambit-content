/**
 * Model for the competitive_stories configuration document. 
 * Each object configures one SMS game.
 */
var mongoose = require('mongoose');

var competitiveStoriesConfigSchema = new mongoose.Schema({

  // Reassigning the _id value to our own self-determined competitive story config id. 
  _id : Number,

  // Contextual information about the game. 
  __comments: String,

  // Message sent to the alpha after invites are sent to the beta.
  alpha_wait_oip: Number,

  // After a beta joins, this message is sent to the alpha asking if she wants to start the game. 
  alpha_start_ask_oip: Number,

  // Message sent to beta asking if she'd like to join the game. 
  beta_join_ask_oip: Number,

  // Message sent to beta after she's joined, telling her to wait until the game has begun. 
  beta_wait_oip: Number,

  // Message sent to the beta after she attempts to join a game in progress. Tells her that a solo game will automatically be created for her. 
  game_in_progress_oip: Number, 

  // Message sent to a user in game 1 after another user in game 1 has joined game 2. Tells original user that a solo game will automatically be created for her.  
  game_ended_from_exit_oip: Number,

  // The first message of actual gameplay. (Level 1)
  story_start_oip: Number,

  // A message informing the user about the solo play option. 
  ask_solo_play : Number,

  // Collection of messages corresponding to the create-from-mobile user flow.
  mobile_create: {

    // Message sent to alpha, asking her to provide the phone number of the second beta she wants to invite to the game. (First number was already texted back to the message triggered by the create-from-mobile keyword.)
    ask_beta_1_oip: Number,

    // Asks alpha to provide phone number of third beta. 
    ask_beta_2_oip: Number, 

    // Error message informing alpha she provided an invalid mobile number. 
    invalid_mobile_oip: Number,

    // Error message informing that the alpha has not provided enough numbers (>=1) for the game to begin. 
    not_enough_players_oip: Number,

  },

  // A large object containing configuration for individual levels of gameplay, end-level logic, and end-game logic. 
  story: {}

})

module.exports = function(connection) {
  return connection.model('competitive_stories', competitiveStoriesConfigSchema);
}