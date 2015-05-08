/**
 * Config model used for persistently tracking a user's setup
 * of a multiplayer SMS game through mobile. Destroyed after game
 * is started or begun. Unused during web creation of games or solo
 * game creation. 
 */

var mongoose = require('mongoose');

var sgGameCreateConfigSchema = new mongoose.Schema({
  // Mobile number of the alpha user
  alpha_mobile: {type: String, index: true},

  // Name of the alpha user
  alpha_first_name: String,

  // Mobile number of beta 1
  beta_mobile_0: String,

  // Name of beta 1 user
  beta_first_name_0: String,

  // Mobile number of beta 2
  beta_mobile_1: String,

  // Name of beta 2 user
  beta_first_name_1: String,

  // Mobile number of beta 3
  beta_mobile_2: String,

  // Name of beta 3 user
  beta_first_name_2: String,

  // Story ID
  story_id: Number,

  // Type of game structure; competitive? collaborative?
  story_type: String
})

module.exports = function(connection) {
  return connection.model('sg_gamecreateconfig', sgGameCreateConfigSchema);
}