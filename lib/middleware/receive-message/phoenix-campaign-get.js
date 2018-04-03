'use strict';

const newrelic = require('newrelic');
const logger = require('winston');

const helpers = require('../../helpers');
const phoenix = require('../../phoenix');
const stathat = require('../../stathat');
const ClosedCampaignError = require('../../../app/exceptions/ClosedCampaignError');
const replies = require('../../replies');

module.exports = function getCampaign() {
  return (req, res, next) => {
    const campaignId = req.campaignId;
    return helpers.campaign.getById(campaignId)
      .then((campaign) => {
        req.campaign = campaign; // eslint-disable-line no-param-reassign
        newrelic.addCustomParameters({ campaignId: campaign.id });
        helpers.handleTimeout(req, res);

        if (phoenix.isClosedCampaign(campaign)) {
          const err = new ClosedCampaignError(campaign);
          logger.warn(err.message);
          stathat.postStat(err.message);

          return replies.campaignClosed(req, res);
        }

        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
