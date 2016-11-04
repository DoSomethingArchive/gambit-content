'use strict';

/**
 * Models a Gambit Jr. CampaignBot.
 */
const mongoose = require('mongoose');
const Promise = require('bluebird');
const gambitJunior = rootRequire('lib/junior');
const logger = app.locals.logger;

const campaignBotSchema = new mongoose.Schema({

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
  msg_menu_signedup_external: String,
  msg_menu_signedup_gambit: String,
  msg_no_photo_sent: String,
  msg_signup_broadcast_declined: String,

});

/**
 * Query Gambit Jr API for given CampaignBot and store.
 */
campaignBotSchema.statics.lookupByID = function (id) {
  const model = this;

  return new Promise((resolve, reject) => {
    logger.debug(`campaignBotSchema.lookupByID:${id}`);

    return gambitJunior
      .get('campaignbots', id)
      .then(response => {
        const data = response;
        data._id = Number(response.id);
        data.id = undefined;

        return model
          .findOneAndUpdate({ _id: data._id }, data, { upsert: true, new: true })
          .exec()
          .then(campaignBot => resolve(campaignBot))
          .catch(error => reject(error));
      })
      .catch(error => reject(error));
  });
};

module.exports = function (connection) {
  return connection.model('campaignbots', campaignBotSchema);
};
