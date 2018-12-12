'use strict';

const { GatewayClient } = require('@dosomething/gateway/server');

let gatewayClient;

function getClient() {
  if (!gatewayClient) {
    gatewayClient = GatewayClient.getNewInstance();
  }
  return gatewayClient;
}

/**
 * @param {Number} campaignId
 * @return {Promise}
 */
function fetchCampaignById(campaignId) {
  return module.exports.getClient().Rogue.Campaigns.get(campaignId);
}

module.exports = {
  fetchCampaignById,
  getClient,
};
