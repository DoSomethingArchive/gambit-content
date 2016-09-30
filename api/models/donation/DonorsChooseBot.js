'use strict';

/**
 * Model for a Gambit Jr. DonorsChooseBot.
 * Each document contains copy to use for each message sent in DonorsChooseBot
 * Chatbot conversations.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({

  // Corresponds to the DonorsChooseBot ID in Gambit Jr. API.
  _id: Number,
  // Last refresh from Gambit Jr. API.
  refreshed_at: Date,
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
  msg_search_no_results: String,

});

module.exports = function (connection) {
  return connection.model(app.ConfigName.DONORSCHOOSEBOTS, schema, 'donorschoosebots');
};
