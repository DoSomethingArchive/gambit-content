'use strict';

/**
 * Models a DS Campaign.
 */
const mongoose = require('mongoose');
const logger = app.locals.logger;
const phoenix = require('../../lib/phoenix');
const MessagingGroups = require('../../lib/groups');

const campaignSchema = new mongoose.Schema({

  _id: { type: Number, index: true },
  current_run: Number,
  mobilecommons_group_doing: Number,
  mobilecommons_group_completed: Number,

});

function parsePhoenixCampaign(phoenixCampaign) {
  const data = {
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

    return phoenix.client.Campaigns.index({ ids: campaignIds })
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
      .catch((err) => {
        const scope = err;
        scope.message = `Campaign.lookupByIds error:${err.message}`;

        return reject(scope);
      });
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
    .catch(error => logger.error(`Campaign.findOrCreateMessagingGroups error: ${error.message}`));
};

/**
 * Returns formatted Campaign object to return in campaigns endpoint.
 */
campaignSchema.methods.formatApiResponse = function () {
  const data = {
    id: this._id,
    current_run: this.current_run,
    mobilecommons_group_doing: this.mobilecommons_group_doing,
    mobilecommons_group_completed: this.mobilecommons_group_completed,
  };

  return data;
};

module.exports = mongoose.model('campaigns', campaignSchema);
