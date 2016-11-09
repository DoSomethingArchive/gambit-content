'use strict';

/**
 * Models a conversation request to Gambit API.
 */
const mongoose = require('mongoose');

const botRequestSchema = new mongoose.Schema({

  created_at: { type: Date, default: Date.now() },
  client: String,
  query: Object,
  body: Object,
  user_id: String,
  campaign_id: Number,
  bot_type: String,
  bot_id: String,
  bot_response_type: String,
  bot_response_message: String,

});

/**
 * Creates BotRequest model for given incoming Express request.
 * @param {object} req - Express request
 * @param {string} botType - Type of bot handling response (campaignbot, donorschoosebot)
 * @param {string} msgType - Type of bot message to respond back with
 * @param {string} msg - Rendered bot response message text
 * @param {Signup} signup - Signup model. If set, stores user and campaign ID's.
 */
botRequestSchema.statics.log = function (req, botType, botId, msgType, msg) {
  const data = {
    client: req.client,
    query: req.query,
  };

  if (req.client === 'mobilecommons') {
    data.body = {};
    const properties = [
      'args',
      'broadcast_id',
      'keyword',
      'mdata_id',
      'message_id',
      'mms_image_url',
      'phone',
      'profile_id',
    ];
    properties.forEach((property) => {
      data.body[property] = req.body[property];
    });
  } else {
    data.body = req.body;
  }
  if (req.user) {
    data.user_id = req.user._id;
  }
  if (req.campaign) {
    data.campaign_id = req.campaign._id;
  }
  data.bot_type = botType;
  data.bot_id = botId;
  data.bot_response_type = msgType;
  data.bot_response_message = msg;

  return this.create(data);
};

module.exports = function (connection) {
  return connection.model('bot_requests', botRequestSchema);
};
