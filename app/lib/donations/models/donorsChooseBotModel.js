/**
 * Model for the DonorsChoose SMS configuration document. Each 
 * object corresponds to one DonorsChoose donation endgame flow.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
  // Corresponds to the donorschoose_bot ID in Gambit Jr. API.
  _id: Number,
  name: String,
  // Last refresh from Gambit Jr. API.
  refreshed_at: Date,
  // Donation_bot properties are loaded from Gambit Jr. API.
  msg_ask_email: String,
  msg_ask_first_name: String,
  msg_ask_zip: String,
  msg_donation_success: String,
  msg_error_generic: String,
  msg_invalid_email: String,
  msg_invalid_first_name: String,
  msg_invalid_zip: String,
  msg_project_link: String,
  msg_max_donations_reached: String,
  msg_search_start: String,
  msg_search_no_results: String
});

module.exports = function(connection) {
  return connection.model(app.ConfigName.DONORSCHOOSE_BOTS, schema, 'donorschoose_bots');
};
