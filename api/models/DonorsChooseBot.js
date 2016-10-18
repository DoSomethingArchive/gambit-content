'use strict';

/**
 * Models a Gambit Jr. DonorsChooseBot.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({

  _id: { type: Number, index: true },
  msg_ask_email: String,
  msg_ask_first_name: String,
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
  return connection.model('donorschoosebots', schema);
};
