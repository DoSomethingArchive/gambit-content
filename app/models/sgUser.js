/**
 * Mongoose data model for an SMS game user.
 */

var mongoose = require('mongoose')
    ;

var sgUser = function(app) {
  var modelName = 'sg_user';

  var schema = new mongoose.Schema({
    // Timestamp. 
    updated_at: {type: Date, default: Date.now()},

    // Phone number of this user
    phone: {type: String, index: true},

    // _id of the game the user is currently in
    current_game_id: mongoose.Schema.Types.ObjectId
  });

  return app.getModel(modelName, schema);
};

module.exports = sgUser;
