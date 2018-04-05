'use strict';

const underscore = require('underscore');

/**
 * @param {object} phoenixCampaign
 * @return {object}
 */
function formatCampaign(phoenixCampaign) {
  const properties = ['id', 'title', 'status'];

  return underscore.pick(phoenixCampaign, properties);
}

module.exports = function formatPhoenixCampaigns() {
  return (req, res) => {
    const data = [];

    req.phoenixCampaigns.forEach((phoenixCampaign) => {
      const formattedCampaign = formatCampaign(phoenixCampaign);
      formattedCampaign.keywords = req.keywordsByCampaignId[phoenixCampaign.id];
      data.push(formattedCampaign);
    });

    return res.send({ data });
  };
};
