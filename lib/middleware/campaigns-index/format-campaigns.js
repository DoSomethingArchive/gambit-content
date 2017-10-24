'use strict';

const underscore = require('underscore');

/**
 * @param {object} phoenixCampaign
 * @param {boolean} excludeGroups
 * @return {object}
 */
function formatCampaign(phoenixCampaign, excludeGroups) {
  const properties = ['id', 'title', 'status'];
  if (!excludeGroups) {
    properties.push('currentCampaignRun');
  }
  return underscore.pick(phoenixCampaign, properties);
}

module.exports = function formatPhoenixCampaigns() {
  return (req, res, next) => {
    const data = [];
    // TODO: Remove this check (and the Mobile Commons Groups middleware) once TGM is live.
    const excludeGroups = req.query.exclude;

    req.phoenixCampaigns.forEach((phoenixCampaign) => {
      const formattedCampaign = formatCampaign(phoenixCampaign, excludeGroups);
      formattedCampaign.keywords = req.keywordsByCampaignId[phoenixCampaign.id];
      data.push(formattedCampaign);
    });

    if (excludeGroups) {
      return res.send({ data });
    }

    req.data = data;
    return next();
  };
};
