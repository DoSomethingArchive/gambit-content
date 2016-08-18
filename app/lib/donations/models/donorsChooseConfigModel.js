/**
 * Model for the DonorsChoose SMS configuration document. Each 
 * object corresponds to one DonorsChoose donation endgame flow.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
  // Mobile Commons Campaign ID for the Donation campaign.
  // e.g. https://secure.mcommons.com/campaigns/[id]
  _id: Number,
  __comments: String,
  oip_chat: Number,
  oip_end_chat: Number
});

module.exports = function(connection) {
  return connection.model(app.ConfigName.DONORSCHOOSE, schema, 'donorschoose');
};
