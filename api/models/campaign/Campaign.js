/**
 * Models a DS Campaign.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({

  _id: {type: Number, index: true},

  title: String,

  rb_noun: String,

  rb_verb: String,

  // We're using Mobile Commons campaigns like Phoenix Campaign Runs.
  // We create a new Mobile Commons campaign when the DS Campaign's 
  // Signup and Quantity totals need start at 0 again for this year/month's run.
  current_mobilecommons_campaign: Number

})

module.exports = function(connection) {
  return connection.model('campaigns', schema);
};
