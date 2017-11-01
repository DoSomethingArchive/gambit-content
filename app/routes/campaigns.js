'use strict';

const express = require('express');

const router = express.Router({ mergeParams: true }); // eslint-disable-line new-cap
const logger = require('winston');

const ClosedCampaignError = require('../exceptions/ClosedCampaignError');
const contentful = require('../../lib/contentful');
const helpers = require('../../lib/helpers');
const mobilecommons = require('../../lib/mobilecommons');
const phoenix = require('../../lib/phoenix');
const stathat = require('../../lib/stathat');


// Config
const requiredParamsConf = require('../../config/middleware/campaigns/required-params');

// Middleware
const requiredParamsMiddleware = require('../../lib/middleware/required-params');

// Check for required body params.
router.use(requiredParamsMiddleware(requiredParamsConf));

/**
 * POST /:id/message: Sends SMS message to given mobile with the given Campaign and message type.
 *
 * First check for required parameters.
 */
router.post('/', (req, res, next) => {
  logger.debug(`campaigns/:id/message post:${JSON.stringify(req.body)}`);
  // Check required parameters.
  /* eslint-disable no-param-reassign */
  req.campaignId = req.params.campaignId;
  req.phone = req.body.phone;
  req.messageType = req.body.type;
  /* eslint-enable no-param-reassign */

  if (!req.messageType) {
    return helpers.sendUnproccessibleEntityResponse(res, 'Missing required type parameter.');
  }
  return next();
});

/**
 * Fetch Campaign from Phoenix API and validate its Campaign Status active.
 */
router.post('/', (req, res, next) => {
  phoenix.getCampaignById(req.campaignId)
    .then((phoenixCampaign) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }

      if (phoenix.isClosedCampaign(phoenixCampaign)) {
        const err = new ClosedCampaignError(phoenixCampaign);
        return helpers.sendUnproccessibleEntityResponse(res, err.message);
      }

      req.campaign = phoenixCampaign; // eslint-disable-line no-param-reassign

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * Fetch Campaign Keywords from Contentful to validate its running on Gambit.
 */
router.post('/', (req, res, next) => {
  contentful.fetchKeywordsForCampaignId(req.campaignId)
    .then((keywords) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }

      if (keywords.length === 0) {
        const msg = `Campaign ${req.campaignId} does not have any Gambit keywords.`;
        return helpers.sendUnproccessibleEntityResponse(res, msg);
      }

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * Render our campaign message to send.
 */
router.post('/', (req, res, next) => {
  contentful.renderMessageForPhoenixCampaign(req.campaign, req.messageType)
    .then((message) => {
      if (req.timedout) {
        return helpers.sendTimeoutResponse(res);
      }

      req.messageBody = helpers.addSenderPrefix(message); // eslint-disable-line no-param-reassign

      return next();
    })
    .catch(err => helpers.sendErrorResponse(res, err));
});

/**
 * Post to Mobile Commons to send the message.
 */
router.post('/', (req, res) => {
  const statName = `campaignbot:${req.messageType}`;

  try {
    mobilecommons.send_message(req.phone, req.messageBody);
    const msg = `Sent messageType:${req.messageType} campaign:${req.campaignId} ` +
                `phone:${req.phone}`;
    logger.info(msg);
    stathat.postStat(statName);

    return helpers.sendResponse(res, 200, req.messageBody);
  } catch (err) {
    // Check for response object that Mobile Commons may send:
    if (err.response) {
      logger.error(err.response.error);
    }

    return helpers.sendErrorResponse(res, err);
  }
});

module.exports = router;
