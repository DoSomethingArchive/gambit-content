/**
 * Mapping between game id and game model. Makes it easier
 * to find out which collection to find a game's details
 * given its id.
 */

var mongoose = require('mongoose')
  ;

var sgGameMapping = function(app) {
  var modelName = 'sg_gamemapping';

  var schema = new mongoose.Schema();
  schema.add({
    // Game ID
    game_id: mongoose.Schema.Types.ObjectId,

    // Model used for this game
    game_model: String
  });

  var db = mongoose.createConnection(app.get('database-uri'));
  return db.model(modelName, schema);
};

module.exports = sgGameMapping;
