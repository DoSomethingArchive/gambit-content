/**
 * Each object corresponds to one DonorsChoose Donation Mobile Commons campaign.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
  // Mobile Commons Campaign ID for the Donation campaign.
  // e.g. https://secure.mcommons.com/campaigns/[id]
  _id: Number,
  __comments: String,
  oip_chat: Number,
  oip_success: Number,
  oip_error: Number
});

module.exports = function(connection) {
  return connection.model(app.ConfigName.DONORSCHOOSE, schema, 'donorschoose_moco_campaigns');
};
