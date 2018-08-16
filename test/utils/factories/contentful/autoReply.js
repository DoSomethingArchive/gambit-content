'use strict';

const stubs = require('../../stubs');
const campaignFactory = require('./campaign');

function getValidAutoReply(date = Date.now()) {
  const data = {
    sys: stubs.contentful.getSysWithTypeAndDate('autoReply', date),
    fields: {
      name: stubs.getRandomName(),
      autoReply: stubs.getRandomMessageText(),
      campaign: campaignFactory.getValidCampaign(),
    },
  };
  return data;
}

function getValidAutoReplyWithoutCampaign(date = Date.now()) {
  const autoReply = getValidAutoReply(date);
  // If an entry is not saved to a reference field in Contentful, the field is set to null.
  autoReply.fields.campaign = null;

  return autoReply;
}

module.exports = {
  getValidAutoReply,
  getValidAutoReplyWithoutCampaign,
};
