/**
 * Models a DS User.
 */
var mongoose = require('mongoose');
var Mixed = mongoose.Schema.Types.Mixed;

var schema = new mongoose.Schema({

  _id: {type: String, index: true},

  mobile: {type: String, index: true},

  phoenix_id: Number,

  email: String,

  first_name: String,

  supports_mms: {type: Boolean, default: false},

  // Hash table to store current signups: e.g. campaigns[campaignId] = signupId;
  campaigns: {type: Mixed, default: {}}

})

module.exports = function(connection) {
  return connection.model('users', schema);
};
