/**
 * Models a DS User.
 */
var mongoose = require('mongoose');
var Mixed = mongoose.Schema.Types.Mixed;

var schema = new mongoose.Schema({

  _id: {type: String, index: true},

  mobile: {type: String, index: true},

  first_name: String,

  supports_mms: {type: Boolean, default: false},

  campaigns: {type: Mixed, default: {}}

})

module.exports = function(connection) {
  return connection.model('users', schema);
};
