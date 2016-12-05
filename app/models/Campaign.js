'use strict';

/**
 * Models a DS Campaign.
 */
const mongoose = require('mongoose');
const logger = app.locals.logger;
const MessagingGroups = require('../../lib/groups');

const campaignSchema = new mongoose.Schema({

  _id: { type: Number, index: true },
  keywords: [String],

  // Properties cached from DS API.
  title: String,
  current_run: Number,
  fact_problem: String,
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
    status: phoenixCampaign.status,
    tagline: phoenixCampaign.tagline,
    title: phoenixCampaign.title,
    current_run: phoenixCampaign.currentCampaignRun.id,
    fact_problem: phoenixCampaign.facts.problem,
    msg_rb_confirmation: phoenixCampaign.reportbackInfo.confirmationMessage,
    rb_noun: phoenixCampaign.reportbackInfo.noun,
    rb_verb: phoenixCampaign.reportbackInfo.verb,
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
  let campaignBotCampaign = false;
  if (app.locals.campaigns[this._id]) {
    campaignBotCampaign = true;
  }

  // TODO: Add all other properties.
  const data = {
    id: this._id,
    title: this.title,
    campaignbot: campaignBotCampaign,
    status: this.status,
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
