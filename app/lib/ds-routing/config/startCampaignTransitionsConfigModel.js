/**
 * Model for the DonorsChoose SMS configuration document. Each 
 * object corresponds to one DonorsChoose donation endgame flow.
 */
var mongoose = require('mongoose');

var startCampaignTransitionsConfigSchema = new mongoose.Schema({

  // Reassigning the _id value to the unique id of the mData which controls the tips flow. Automatically indexed. 
  _id : Number,

  // Contextual information about the donorschoose donation flow. 
  __comments: String,

  // OIP which begins the donation. 
  start_donation_flow: Number,

  // Error notification OIP. 
  invalid_state_oip: Number,

  // Error notification OIP. 
  invalid_zip_oip: Number,

  // OIP sent after DonorsChoose project found. 
  found_project_ask_name: Number,

  // OIP sent asking for email address to complete transaction. 
  received_name_ask_email: Number,

  // OIP sent after donation is complete. 
  donate_complete: Number,

  // Error notification OIP. 
  error_direct_user_to_restart: Number

})

module.exports = function(connection) {
  return connection.model('start_campaign_transitions_config', startCampaignTransitionsConfigSchema);
}