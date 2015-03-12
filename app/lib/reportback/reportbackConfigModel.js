/**
 * Configuration defining a report back flow.
 */
var mongoose = require('mongoose');

var rbSchema = new mongoose.Schema({
  // Mobile Commons ID of the campaign just completed
  campaign_completed_id: Number,

  // Drupal node ID
  campaign_nid: Number,

  // Mobile Commons campaign ID to opt user out of
  campaign_optout_id: Number,

  // Resource name used as endpoint in URL
  endpoint: String,

  // Mobile Commons opt-in path ID for successfully completed report back
  message_complete: Number,

  // Mobile Commons opt-in path ID for when the MMS response doesn't contain a photo
  message_not_a_photo: Number,

  // Mobile Commons opt-in path ID to ask for quantity
  message_quantity: Number,

  // Mobile Commons opt-in path ID to ask why
  message_why: Number
});

module.exports = function(connection) {
  return connection.model(app.ConfigName.REPORTBACK, rbSchema);
}