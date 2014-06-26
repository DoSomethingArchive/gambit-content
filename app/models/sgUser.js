/**
 * Mongoose data model for an SMS game user.
 */

var mongoose = require('mongoose')
    ;

var sgUser = function(app) {
  var modelName = 'sg_user';
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

module.exports = sgUser;
