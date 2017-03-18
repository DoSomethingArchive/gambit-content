'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const Promise = require('bluebird');
const Campaign = require('../models/Campaign');
const ClosedCampaignError = require('../exceptions/ClosedCampaignError');
const NotFoundError = require('../exceptions/NotFoundError');
const UnprocessibleEntityError = require('../exceptions/UnprocessibleEntityError');

const contentful = require('../../lib/contentful');
const helpers = require('../../lib/helpers');
const mobilecommons = rootRequire('lib/mobilecommons');
const phoenix = require('../../lib/phoenix');
const logger = app.locals.logger;
const stathat = app.locals.stathat;

/**
 * Queries Phoenix, Contentful, and Mongo to render an object for a given Campaign id.
 * If renderMessages is set to true, includes all rendered messages as a messages property.
 */
function fetchCampaign(id, renderMessages) {
  const campaign = { id };

  return new Promise((resolve, reject) => {
    logger.debug(`fetchCampaign:${id}`);

    return phoenix.client.Campaigns.get(id)
      .then((phoenixCampaign) => {
        campaign.title = phoenixCampaign.title;
        campaign.status = phoenixCampaign.status;
        if (renderMessages === true) {
          return contentful.renderAllMessagesForPhoenixCampaign(phoenixCampaign);
        }

        return false;
      })
      .then((renderedMessages) => {
        if (renderedMessages) {
          campaign.messages = renderedMessages;
        }

        return contentful.fetchKeywordsForCampaignId(id);
      })
      .then((keywords) => {
        campaign.keywords = keywords;

        return Campaign.findById(id).exec();
      })
      .then((campaignDoc) => {
        if (!campaignDoc) {
          logger.warn(`Could not find campaigns document for id ${id}.`);
          return resolve(campaign);
        }

        campaign.current_run = campaignDoc.current_run;
        campaign.mobilecommons_group_doing = campaignDoc.mobilecommons_group_doing;
        campaign.mobilecommons_group_completed = campaignDoc.mobilecommons_group_completed;

        return resolve(campaign);
      })
      .catch(error => {
        if (error.message === 'Not Found') {
          const notFoundError = new NotFoundError(`Campaign ${id} not found`);
          return reject(notFoundError);
        }

        return reject(error);
      });
  });
}

/**
 * GET index of campaigns.
 */
router.get('/', (req, res) => {
  logger.debug('get campaigns');
  stathat('route: v1/campaigns');

  return contentful.fetchCampaignIdsWithKeywords()
    .then(campaignIds => Promise.map(campaignIds, fetchCampaign))
    .then(data => res.send({ data }))
    .catch(error => helpers.sendResponse(res, 500, error.message));
});

/**
 * GET single campaign.
 */
router.get('/:id', (req, res) => {
  stathat('route: v1/campaigns/{id}');
  const campaignId = req.params.id;
  let response;

  return fetchCampaign(campaignId, true)
    .then((data) => {
      response = data;

      return contentful.fetchCampaign(campaignId);
    })
    .then((contentfulCampaign) => {
      const spaceId = process.env.CONTENTFUL_SPACE_ID;
      const contentfulId = contentfulCampaign.sys.id;
      const uri = `https://app.contentful.com/spaces/${spaceId}/entries/${contentfulId}`;
      response.contentfulUri = uri;

      return res.send({ data: response });
    })
    // TODO: Refactor helpers.sendResponse to accept an error and know the codes based on custom
    // error class, to DRY.
    .catch(NotFoundError, err => helpers.sendResponse(res, 404, err.message))
    .catch(UnprocessibleEntityError, err => helpers.sendResponse(res, 422, err.message))
    .catch(err => helpers.sendResponse(res, 500, err.message));
});

/**
 * Sends SMS message to given phone number with the given Campaign and its message type.
 */
router.post('/:id/message', (req, res) => {
  // Check required parameters.
  const campaignId = req.params.id;
  const phone = req.body.phone;
  const type = req.body.type;

  if (!campaignId) {
    return helpers.sendResponse(res, 422, 'Missing required campaign id.');
  }
  if (!phone) {
    return helpers.sendResponse(res, 422, 'Missing required phone parameter.');
  }
  if (!type) {
    return helpers.sendResponse(res, 422, 'Missing required message type parameter.');
  }

  let messageBody;
  const loadCampaignMessage = new Promise((resolve, reject) => {
    logger.debug(`loadCampaignMessage campaign:${campaignId} msgType:${type}`);
    let campaign;

    return phoenix.client.Campaigns.get(campaignId)
      .then((phoenixCampaign) => {
        logger.debug(`phoenix.client.Campaigns.get found campaign:${campaignId}`);
        if (phoenix.isClosedCampaign(phoenixCampaign)) {
          const err = new ClosedCampaignError(phoenixCampaign);
          return reject(err);
        }
        campaign = phoenixCampaign;

        return contentful.fetchKeywordsForCampaignId(campaignId);
      })
      .then((keywords) => {
        if (keywords.length === 0) {
          const msg = `Campaign ${campaignId} does not have any Gambit keywords.`;
          const err = new UnprocessibleEntityError(msg);
          return reject(err);
        }

        return contentful.renderMessageForPhoenixCampaign(campaign, type);
      })
      .then(message => resolve(message))
      .catch(err => reject(err));
  });

  return loadCampaignMessage
    .then((message) => {
      messageBody = helpers.addSenderPrefix(message);
      mobilecommons.send_message(phone, messageBody);
      const msg = `Sent message:${type} for campaign:${campaignId} to phone:${phone}`;
      logger.info(msg);
      stathat(`Sent campaign message:${type}`);

      return helpers.sendResponse(res, 200, messageBody);
    })
    .catch(UnprocessibleEntityError, (err) => {
      logger.error(err.message);

      return helpers.sendResponse(res, 422, err.message);
    })
    .catch((err) => {
      if (err.response) {
        logger.error(err.response.error);
      }
      const msg = `Error sending text to phone:${phone}: ${err.message}`;

      return helpers.sendResponse(res, 500, msg);
    });
});

module.exports = router;
