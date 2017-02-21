'use strict';

/**
 * Models a Gambit Jr. CampaignBot.
 */
const mongoose = require('mongoose');
const Promise = require('bluebird');
const gambitJunior = rootRequire('lib/junior');
const helpers = require('../../lib/helpers');
const logger = app.locals.logger;
const stathat = app.locals.stathat;

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

/**
 * Returns rendered CampaignBot message for given Express req and msgType.
 * @param {object} req - Express request
 * @param {string} msgType - Type of bot message to send back
 * @param {string} prefix - If set, prepended to the bot message text
 * @return {string} - CampaignBot message with Liquid tags replaced with req properties
 */
campaignBotSchema.methods.renderMessage = function (req, msgType, prefix) {
  const logMsg = `campaignbot:${msgType}`;
  logger.info(logMsg);
  stathat(logMsg);

  const campaign = req.campaign;
  if (!campaign.id) {
    throw new Error('req.campaign undefined');
  }

  const botProperty = `msg_${msgType}`;
  let msg = this[botProperty];
  // TODO: Use db.campaigns.findById to check for overrides/keywords instead of app.locals.campaigns
  const campaignDoc = app.locals.campaigns[campaign.id];
  if (campaignDoc && campaignDoc[botProperty]) {
    msg = campaignDoc[botProperty];
  }

  if (!msg) {
    throw new Error(`bot msgType:${msgType} not found`);
  }

  if (prefix) {
    msg = `${prefix}${msg}`;
  }

  if (!req.signup) {
    return helpers.replacePhoenixCampaignVars(msg, campaign);
  }

  return helpers.replacePhoenixCampaignVars(msg, campaign, req.signup.keyword)
    .then((renderedMessage) => {
      let scope = renderedMessage;
      let quantity = req.signup.total_quantity_submitted;
      if (req.signup.draft_reportback_submission) {
        quantity = req.signup.draft_reportback_submission.quantity;
      }
      scope = scope.replace(/{{quantity}}/gi, quantity);
      const revisiting = req.keyword && req.signup.draft_reportback_submission;
      if (revisiting) {
        // TODO: New bot property for continue draft message
        const continueMsg = 'Picking up where you left off on';
        scope = `${continueMsg} ${campaign.title}...\n\n${scope}`;
      }

      return scope;
    })
    .catch(err => err);
};

module.exports = function (connection) {
  return connection.model('campaignbots', campaignBotSchema);
};
