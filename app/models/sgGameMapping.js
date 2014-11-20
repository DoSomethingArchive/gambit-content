/**
 * Mapping between game id and game model. Makes it easier
 * to find out which collection to find a game's details
 * given its id.
 */

var mongoose = require('mongoose');

var sgGameMappingSchema = new mongoose.Schema({
  // Game ID
  game_id: {type: mongoose.Schema.Types.ObjectId, index: true},

  // Model used for this game
  game_model: String
})

module.exports = mongoose.model('sg_gamemapping', sgGameMappingSchema);