'use strict';

/**
 * Models a DS Campaign.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({

  _id: { type: Number, index: true },
  keywords: [String],

  // Properties cached from DS API.
  title: String,
  msg_rb_confirmation: String,
  rb_noun: String,
  rb_verb: String,
  status: { type: String, enum: ['active', 'closed'] },
  tagline: String,
  type: String,

  // Properties to override CampaignBot content.
  msg_ask_caption: String,
  msg_ask_photo: String,
  msg_ask_quantity: String,
  msg_ask_why_participated: String,
  msg_invalid_quantity: String,
  msg_member_support: String,
  msg_menu_completed: String,
  msg_menu_signedup: String,
  msg_no_photo_sent: String,

  // Mobile Commons Specific Fields.
  mobileCommonsGroups: {
    doing: String,
    completed: String,
  },

});

module.exports = function (connection) {
  return connection.model('campaigns', schema);
};
