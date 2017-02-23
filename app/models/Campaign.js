'use strict';

/**
 * Models a DS Campaign.
 */
const mongoose = require('mongoose');
const logger = app.locals.logger;
const helpers = require('../../lib/helpers');
const phoenix = require('../../lib/phoenix');
const MessagingGroups = require('../../lib/groups');

const campaignSchema = new mongoose.Schema({

  _id: { type: Number, index: true },

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
campaignSchema.statics.lookupByIds = function (campaignIds) {
  const model = this;

  return new Promise((resolve, reject) => {
    logger.debug(`Campaign.lookupByIds:${campaignIds}`);

    const promises = [];

    return phoenix.Campaigns.index({ ids: campaignIds })
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
    campaignbot: helpers.isCampaignBotCampaign(this._id),
    current_run: this.current_run,
    mobilecommons_group_doing: this.mobilecommons_group_doing,
    mobilecommons_group_completed: this.mobilecommons_group_completed,
    overrides: {},
  };

  const overrides = [
    'msg_ask_caption',
    'msg_ask_photo',
    'msg_ask_quantity',
    'msg_ask_why_participated',
    'msg_invalid_quantity',
    'msg_member_support',
    'msg_menu_completed',
    'msg_menu_signedup_external',
    'msg_menu_signedup_gambit',
    'msg_no_photo_sent',
  ];
  overrides.forEach(property => (data.overrides[property] = this[property]));

  return data;
};

module.exports = function (connection) {
  return connection.model('campaigns', campaignSchema);
};
