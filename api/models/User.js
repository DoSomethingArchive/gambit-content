/**
 * Models a DS Member.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({

  _id: {type: String, index: true},

  mobile: {type: String, index: true},

  first_name: String,

  supports_mms: {type: Boolean, default: false}

})

module.exports = function(connection) {
  return connection.model('users', schema);
};
