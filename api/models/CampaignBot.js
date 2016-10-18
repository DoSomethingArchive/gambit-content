'use strict';

/**
 * Models a Gambit Jr. CampaignBot.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({

  _id: { type: Number, index: true },
  msg_ask_caption: String,
  msg_ask_photo: String,
  msg_ask_quantity: String,
  msg_ask_why_participated: String,
  msg_campaign_closed: String,
  msg_invalid_cmd_completed: String,
  msg_invalid_cmd_signedup: String,
  msg_invalid_quantity: String,
  msg_member_support: String,
  msg_menu_completed: String,
  msg_menu_signedup: String,
  msg_no_photo_sent: String,

});

module.exports = function (connection) {
  return connection.model('campaignbots', schema);
};
