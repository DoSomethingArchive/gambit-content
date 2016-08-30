/**
 * Models a DS Campaign.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({

  _id: {type: Number, index: true},

  title: String,

  rb_noun: String,

  rb_verb: String

})

module.exports = function(connection) {
  return connection.model('campaigns', schema);
};
