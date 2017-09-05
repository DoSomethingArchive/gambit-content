'use strict';

const express = require('express');

const router = express.Router(); // eslint-disable-line new-cap
const Promise = require('bluebird');
const logger = require('winston');

const ClosedCampaignError = require('../exceptions/ClosedCampaignError');
const UnprocessibleEntityError = require('../exceptions/UnprocessibleEntityError');

const contentful = require('../../lib/contentful');
const groups = require('../../lib/groups');
const helpers = require('../../lib/helpers');

const mobilecommons = require('../../lib/mobilecommons');
const phoenix = require('../../lib/phoenix');
const stathat = require('../../lib/stathat');

/**
 * Queries Phoenix, Contentful, and Mongo to render an object for a given Campaign id.
 * If renderMessages is set to true, includes all rendered messages as a messages property.
 */
function fetchCampaign(id, renderMessages) {
  const campaign = { id };

  return new Promise((resolve, reject) => {
    logger.debug(`fetchCampaign:${id}`);

    return phoenix.fetchCampaign(id)
      .then((phoenixCampaign) => {
        campaign.title = phoenixCampaign.title;
        campaign.status = phoenixCampaign.status;
        campaign.current_run = phoenixCampaign.currentCampaignRun.id;
        if (renderMessages === true) {
          return contentful.renderAllTemplatesForPhoenixCampaign(phoenixCampaign);
        }

        return false;
      })
      .then((renderedTemplates) => {
        if (renderedTemplates) {
          campaign.templates = renderedTemplates;
        }

        return contentful.fetchKeywordsForCampaignId(id);
      })
      .then((keywords) => {
        campaign.keywords = keywords;

        return groups.getGroups(id, campaign.current_run);
      })
      .then((response) => {
        const groupsResponse = response.body.data;
        if (!groupsResponse) {
          logger.warn(`Error returning Messaging Groups API response for id ${id}.`);
          campaign.mobilecommons_group_doing = null;
          campaign.mobilecommons_group_completed = null;

          return resolve(campaign);
        }

        campaign.mobilecommons_group_doing = groupsResponse.doing.id;
        campaign.mobilecommons_group_completed = groupsResponse.completed.id;

        return resolve(campaign);
      })
      .catch(error => reject(error));
  });
}

/**
 * GET index of campaigns.
 */
router.get('/', (req, res) => {
  logger.debug('get campaigns');
  stathat.postStat('route: v1/campaigns');

  return contentful.fetchCampaignIdsWithKeywords()
    .then(campaignIds => Promise.map(campaignIds, fetchCampaign))
    .then(data => res.send({ data }))
    .catch(error => helpers.sendResponse(res, 500, error.message));
});

/**
 * GET single campaign.
 */
router.get('/:id', (req, res) => {
  stathat.postStat('route: v1/campaigns/{id}');
  const campaignId = req.params.id;
  let response;

  return fetchCampaign(campaignId, true)
    .then((data) => {
      response = data;

      return contentful.fetchCampaign(campaignId);
    })
    // TODO: Querying Contentful again here to get its sys.id. We could avoid this extra query
    // by refactoring contentful.renderAllTemplatesForPhoenixCampaign to optionally accept a loaded
    // Contentful campaign.
    .then((contentfulCampaign) => {
      const spaceId = process.env.CONTENTFUL_SPACE_ID;
      const contentfulId = contentfulCampaign.sys.id;
      const uri = `https://app.contentful.com/spaces/${spaceId}/entries/${contentfulId}`;
      response.contentfulUri = uri;

      return res.send({ data: response });
    })
    // TODO: Refactor helpers.sendResponse to accept an error and know the codes based on custom
    // error class, to DRY.
    .catch(UnprocessibleEntityError, err => helpers.sendResponse(res, 422, err.message))
    .catch(err => helpers.sendErrorResponse(res, err));
});

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
router.post('/:id/message', (req, res, next) => {
  logger.debug(`campaigns/:id/message post:${JSON.stringify(req.body)}`);
  // Check required parameters.
  /* eslint-disable no-param-reassign */
  req.campaignId = req.params.id;
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
router.post('/:id/message', (req, res, next) => {
  phoenix.fetchCampaign(req.campaignId)
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
router.post('/:id/message', (req, res, next) => {
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
router.post('/:id/message', (req, res, next) => {
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
router.post('/:id/message', (req, res) => {
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
