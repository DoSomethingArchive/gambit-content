/**
 * Mongoose data model for an SMS game user.
 */

var mongoose = require('mongoose');

var sgUserSchema = new mongoose.Schema({
  // Timestamp. 
  updated_at: {type: Date, default: Date.now},

  // Phone number of this user
  phone: {type: String, index: true},

  // Name of this user
  name: String,

  // _id of the game the user is currently in
  current_game_id: mongoose.Schema.Types.ObjectId
})

module.exports = function(connection) {
  return connection.model('sg_user', sgUserSchema);
}