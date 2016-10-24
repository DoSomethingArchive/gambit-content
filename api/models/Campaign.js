'use strict';

/**
 * Models a DS Campaign.
 */
const mongoose = require('mongoose');
const mobilecommons = rootRequire('lib/mobilecommons');
const parser = require('xml2json');
const logger = app.locals.logger;

const schema = new mongoose.Schema({

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
  mobile_commons_groups: {
    doing: Number,
    completed: Number,
  },

});

function setMobileCommonsGroup(campaign, status, group) {
  const scope = campaign;
  const parsedGroup = JSON.parse(parser.toJson(group));
  // If the group name is available...
  if (parsedGroup.response.success === 'true') {
    // Save newly created group id to this campaign.
    const groupId = parsedGroup.response.group.id;
    scope.mobile_commons_groups[status] = groupId;
  }
}

/**
 * Create Doing/Completed Mobile Commons Groups to support Mobile Commons broadcasting.
 * @see https://github.com/DoSomething/gambit/issues/673
 */
schema.methods.createMobileCommonsGroups = function () {
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
  return connection.model('campaigns', schema);
};
