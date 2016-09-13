/**
 * Model for Gambit Jr. API campaignbot. 
 * Each document contains content to use for each message sent in
 * a DS Campaign conversation.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
  // Corresponds to the campaignbot ID in Gambit Jr. API.
  _id: Number,
  msg_menu_signedup: String,
  msg_ask_supports_mms: String,
  msg_no_supports_mms: String,
  msg_ask_quantity: String,
  msg_invalid_quantity: String,
  msg_ask_photo: String,
  msg_no_photo_sent: String,
  msg_ask_caption: String,
  msg_ask_why_participated: String,
  msg_menu_completed: String
});

module.exports = function(connection) {
  return connection.model(app.ConfigName.CAMPAIGNBOTS, schema, 'campaignbots');
};
