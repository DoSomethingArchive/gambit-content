/**
 * Stores each upsert submission posted to DS Reportback API.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({

  created_at: {type: Date, default: Date.now},

  mobile: {type: String, index: true},

  campaign: {type: Number, index: true},

  quantity: Number

})

module.exports = function(connection) {
  return connection.model('reportback_submissions', schema);
};
