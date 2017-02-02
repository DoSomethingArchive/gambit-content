'use strict';

/**
 * Models a DS Campaign.
 */
const mongoose = require('mongoose');
const logger = app.locals.logger;
const helpers = require('../../lib/helpers');
const MessagingGroups = require('../../lib/groups');

const campaignSchema = new mongoose.Schema({

  _id: { type: Number, index: true },
  keywords: [String],

  // Properties cached from DS API.
  title: String,
  current_run: Number,
  // TODO: Deprecate this. Keep for now as its used by the campaigns/:id/message route.
  status: String,

  // Properties to override CampaignBot content.
  msg_ask_caption: String,
  msg_ask_photo: String,
  msg_ask_quantity: String,
  msg_ask_why_participated: String,
  msg_invalid_quantity: String,
  msg_member_support: String,
  msg_menu_completed: String,
  msg_menu_signedup_external: String,
  msg_menu_signedup_gambit: String,
  msg_no_photo_sent: String,

  // Exposed messages.
  messages: {
    scheduled_relative_to_signup_date: String,
    scheduled_relative_to_reportback_date: String,
  },

  // Mobile Commons Specific Fields.
  mobilecommons_group_doing: Number,
  mobilecommons_group_completed: Number,

});

function parsePhoenixCampaign(phoenixCampaign) {
  const data = {
    title: phoenixCampaign.title,
    status: phoenixCampaign.status,
    current_run: phoenixCampaign.currentCampaignRun.id,
  };

  return data;
}

/**
 * Get given Campaigns from DS API then store.
 */
campaignSchema.statics.lookupByIDs = function (campaignIDs) {
  const model = this;

  return new Promise((resolve, reject) => {
    logger.debug(`Campaign.lookupByIDs:${campaignIDs}`);

    const promises = [];

    return app.locals.clients.phoenix.Campaigns
      .index({ ids: campaignIDs })
      .then((phoenixCampaigns) => {
        phoenixCampaigns.forEach((phoenixCampaign) => {
          const data = parsePhoenixCampaign(phoenixCampaign);
          const upsert = model
            .findOneAndUpdate({ _id: phoenixCampaign.id }, data, { upsert: true, new: true })
            .exec()
            .then(campaign => campaign)
            .catch(error => reject(error));
          promises.push(upsert);
        });

        return resolve(Promise.all(promises));
      })
      .catch(error => reject(error));
  });
};

/**
 * Create Doing/Completed Mobile Commons Groups to support Mobile Commons broadcasting.
 * @see https://github.com/DoSomething/gambit/issues/673
 */
campaignSchema.methods.findOrCreateMessagingGroups = function () {
  const campaignId = this._id;
  const campaignRunId = this.current_run;
  logger.info(`Setting messaging groups: campaign ${campaignId} run ${campaignRunId}`);

  return MessagingGroups.findOrCreateGroup(campaignId, campaignRunId)
    .then((groups) => {
      this.mobilecommons_group_doing = groups.doing;
      this.mobilecommons_group_completed = groups.completed;
      return this.save();
    })
    .catch((error) => {
      logger.error(`findOrCreateMessagingGroups() caught an error: ${error.message}`);
    });
};

/**
 * Returns formatted Campaign object to return in campaigns endpoint.
 */
campaignSchema.methods.formatApiResponse = function () {
  const data = {
    id: this._id,
    title: this.title,
    campaignbot: helpers.isCampaignBotCampaign(this._id),
    current_run: this.current_run,
    mobilecommons_group_doing: this.mobilecommons_group_doing,
    mobilecommons_group_completed: this.mobilecommons_group_completed,
    keywords: this.keywords,
  };

  return data;
};

module.exports = function (connection) {
  return connection.model('campaigns', campaignSchema);
};
