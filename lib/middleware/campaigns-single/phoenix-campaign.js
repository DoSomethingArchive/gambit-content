'use strict';

const helpers = require('../../helpers');

module.exports = function getPhoenixCampaign() {
  return (req, res, next) => {
    req.campaignId = req.params.campaignId;

    return helpers.campaign.getById(req.campaignId)
      .then((campaign) => {
        req.campaign = campaign;
        return helpers.botConfig.fetchByCampaignId(req.campaignId);
      })
      .then((botConfig) => {
        req.campaign.botConfig = {
          postType: helpers.botConfig.parsePostTypeFromBotConfig(botConfig),
        };
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
