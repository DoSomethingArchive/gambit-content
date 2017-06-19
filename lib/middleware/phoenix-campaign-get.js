'use strict';

const newrelic = require('newrelic');
const logger = require('winston');

const helpers = require('../helpers');
const phoenix = require('../phoenix');
const stathat = require('../stathat');
const ClosedCampaignError = require('../../app/exceptions/ClosedCampaignError');

module.exports = function getCampaign() {
  return (req, res, next) => {
    const campaignId = req.campaignId;
    return phoenix.fetchCampaign(campaignId)
      .then((campaign) => {
        req.campaign = campaign; // eslint-disable-line no-param-reassign
        newrelic.addCustomParameters({ campaignId: campaign.id });
        helpers.handleTimeout(req, res);

        if (phoenix.isClosedCampaign(campaign)) {
          const err = new ClosedCampaignError(campaign);
          logger.warn(err.message);
          stathat.postStat(err.message);

          return helpers.endConversationWithMessageType(req, res, 'campaign_closed');
        }

        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
