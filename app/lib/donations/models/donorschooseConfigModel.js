/**
 * Model for the DonorsChoose SMS configuration document. Each 
 * object corresponds to one DonorsChoose donation endgame flow.
 */
var mongoose = require('mongoose');

var donorschooseConfigSchema = new mongoose.Schema({

  // Reassigning the _id value. 
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
  error_direct_user_to_restart: Number,

  // Maximum number of donations a user can make for this campaign.
  max_donations_allowed: Number,

  // OIP sent when the maximum number of donations has already been sent.
  max_donations_reached_oip: Number

})

module.exports = function(connection) {
  return connection.model(app.ConfigName.DONORSCHOOSE, donorschooseConfigSchema, 'donorschoose'); // Third param explicitly setting the name of the collection. 
}