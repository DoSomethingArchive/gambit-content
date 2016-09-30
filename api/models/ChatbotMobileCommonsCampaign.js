'use strict';

/**
 * Models a Mobile Commons Campaign used by Gambit chatbot.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({

  // Mobile Commons Campaign ID:
  // e.g. https://secure.mcommons.com/campaigns/[id]
  _id: Number,
  // For internal notes.
  __comments: String,
  oip_chat: Number,
  oip_success: Number,
  oip_error: Number,

});

module.exports = function (connection) {
  const name = 'chatbot_mobilecommons_campaigns';
  return connection.model(app.ConfigName.CHATBOT_MOBILECOMMONS_CAMPAIGNS, schema, name);
};
