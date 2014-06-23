/**
 * Mongoose data model for a user.
 */

var mongoose = require('mongoose')
    ;

var SGUser = function(app) {
  var modelName = 'SGUser';
  var db = mongoose.createConnection(app.get('database-uri'));

  var schema = new mongoose.Schema({
    // Phone number of this user
    phone: {type: String, index: true},

    // _id of the game the user is currently in
    current_game_id: mongoose.Schema.Types.ObjectId
  });

  var model = db.model(modelName, schema);

  return model;
};

module.exports = SGUser;
