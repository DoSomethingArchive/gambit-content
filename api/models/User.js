/**
 * Models a DS Member.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({

  // Storing mobile as _id for now, but this should eventually be Northstar ID.
  _id: {type: String, index: true},

  mobile: {type: String, index: true},

  first_name: String,

  supports_mms: Boolean

})

module.exports = function(connection) {
  return connection.model('users', schema);
};
