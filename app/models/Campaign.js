'use strict';

/**
 * Models a DS Campaign.
 */
const mongoose = require('mongoose');
const logger = app.locals.logger;
const gambitGroups = require('../../lib/groups');

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
campaignSchema.methods.createMobileCommonsGroups = function () {
  const campaignId = this._id;
  const campaignRunId = this.current_run;

  function parseApiRes(res) {
    if (res._id) {
      // If a group is in the response, save the data for this env.
      const env = process.env.NODE_ENV;
      return {
        doing: res.mobilecommons_groups[env].doing,
        completed: res.mobilecommons_groups[env].completed,
      };
    }

    return false;
  }

  gambitGroups.findGroup(campaignId, campaignRunId).then(res => {
    // If a group was found, save the data.
    const parsedRes = parseApiRes(res);
    if (parsedRes) {
      this.mobilecommons_group_doing = parsedRes.doing;
      this.mobilecommons_group_completed = parsedRes.completed;
      return undefined;
    }

    return gambitGroups.createGroup(campaignId, campaignRunId);
  })
  .then(res => {
    if (res === undefined) {
      return;
    }

    const parsedRes = parseApiRes(res);
    if (parsedRes) {
      this.mobilecommons_group_doing = parsedRes.doing;
      this.mobilecommons_group_completed = parsedRes.completed;
    }
  })
  .then(() => {
    this.save();
  });
};

module.exports = function (connection) {
  return connection.model('campaigns', campaignSchema);
};
