'use strict';

const helpers = require('../../../helpers');

module.exports = function getCampaign() {
  return (req, res, next) => {
    if (!req.topic.campaign) {
      req.campaign = null;
      return next();
    }
    return helpers.campaign.getById(req.topic.campaign.id)
      .then((campaign) => {
        req.campaign = campaign;
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
