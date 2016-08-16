/**
 * Model for the DonorsChoose SMS configuration document. Each 
 * object corresponds to one DonorsChoose donation endgame flow.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({

  // Corresponds to Mobile Commons Campaign ID used for Donation conversation.
  // v1 Used numeric convetion 101 for 2014 SS, 201 for 2015 SS.
  _id: Number,

  // Contextual information about Campaign, used for Compose admin readability. 
  __comments: String,

  // Chatbot config:
  msg_ask_email: String,
  msg_ask_first_name: String,
  msg_ask_zip: String,
  msg_donation_success: String,
  msg_error_generic: String,
  msg_invalid_zip: String,
  msg_project_link: String,
  msg_max_donations_reached: String,
  msg_searching_by_zip: String,
  oip_chat: Number,
  oip_end_chat: Number

});

module.exports = function(connection) {
  return connection.model(app.ConfigName.DONORSCHOOSE, schema, 'donorschoose');
};
