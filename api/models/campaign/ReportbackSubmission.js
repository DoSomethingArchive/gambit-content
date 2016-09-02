/**
 * Models each upsert submission posted to DS Reportback API.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({

  user: {type: String, index: true},

  campaign: {type: Number, index: true},

  created_at: {type: Date, default: Date.now},

  quantity: Number,

  why_participated: String,

  submitted_at: Date

})

module.exports = function(connection) {
  return connection.model('reportback_submissions', schema);
};
