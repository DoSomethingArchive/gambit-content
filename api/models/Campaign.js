'use strict';

/**
 * Models a DS Campaign.
 */
const mongoose = require('mongoose');
const mobilecommons = rootRequire('lib/mobilecommons');
const parser = require('xml2json');
const logger = app.locals.logger;

const campaignSchema = new mongoose.Schema({

  _id: { type: Number, index: true },
  keywords: [String],

  // Properties cached from DS API.
  title: String,
  current_run: Number,
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
  mobilecommons_groups: {
    doing: Number,
    completed: Number,
  },

});

function parsePhoenixCampaign(phoenixCampaign) {
  const data = {
    status: phoenixCampaign.status,
    tagline: phoenixCampaign.tagline,
    title: phoenixCampaign.title,
    current_run: phoenixCampaign.currentCampaignRun.id,
    msg_rb_confirmation: phoenixCampaign.reportbackInfo.confirmationMessage,
    rb_noun: phoenixCampaign.reportbackInfo.noun,
    rb_verb: phoenixCampaign.reportbackInfo.verb,
  };

  return data;
}

/**
 * For a given campaign, update its mobile commons group id,
 * based on the mobile commons response.
 * @param {Campaign} campaign    Campaign model to update.
 * @param {string} status        Either completed or doing.
 * @param {string} groupResponse XML string from mobile commons API.
 */
function setMobileCommonsGroup(campaign, status, groupResponse) {
  const scope = campaign;
  const parsedGroup = JSON.parse(parser.toJson(groupResponse));
  // If the group name is available...
  if (parsedGroup.response.success === 'true') {
    // Save newly created group id to this campaign.
    const groupId = parsedGroup.response.group.id;
    scope.mobilecommons_groups[status] = groupId;
  }
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
  const campaign = this;
  const prefix = `env=${process.env.NODE_ENV}
                  campaign_id=${campaign._id}
                  run_id=${campaign.current_run}`;

  // Create mobile commons group with custom name based on this campaign
  mobilecommons.createGroup(`${prefix} status=doing`)
  .then(doingGroup => setMobileCommonsGroup(campaign, 'doing', doingGroup))
  .then(() => mobilecommons.createGroup(`${prefix} status=completed`))
  .then(completedGroup => setMobileCommonsGroup(campaign, 'completed', completedGroup))
  .then(() => campaign.save())
  .catch(err => logger.error(err));
};

module.exports = function (connection) {
  return connection.model('campaigns', campaignSchema);
};
