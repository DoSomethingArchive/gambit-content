/**
 * Models a DS Signup.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({

// We'll want to add this back in once we start integrate Signups API
//  _id: {type: Number, index: true},

  user: {type: String, index: true},

  campaign: {type: Number, index: true},

  created_at: {type: Date, default: Date.now}

})

module.exports = function(connection) {
  return connection.model('signups', schema);
};
