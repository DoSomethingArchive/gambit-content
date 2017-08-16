'use strict';

const emojiStrip = require('emoji-strip');
const newrelic = require('newrelic');
const logger = require('winston');
const Promise = require('bluebird');

const stathat = require('../../lib/stathat');
const helpers = require('../../lib/helpers');

// Compile body params for logging (Mobile Commons sends through more than we need to pay
// attention to an incoming req.body).
function logParams(req) {
  stathat.postStat(`route: ${req.baseUrl}`);
  const incomingParams = {
    phone: req.body.phone,
    profile_id: req.body.profile_id,
    incoming_message: req.incoming_message,
    incoming_image_url: req.incoming_image_url,
    broadcast_id: req.broadcast_id,
    keyword: req.keyword,
  };
  logger.info(`${req.baseUrl} post:${JSON.stringify(incomingParams)}`);
}

function addNewRelicParams(req) {
  newrelic.addCustomParameters({
    incomingImageUrl: req.incoming_image_url,
    incomingMessage: req.incoming_message,
    keyword: req.keyword,
    mobileCommonsBroadcastId: req.broadcast_id,
    mobileCommonsMessageId: req.body.message_id,
    mobileCommonsProfileId: req.body.profile_id,
  });
}

function parseRetryCount(req) {
  req.retryCount = Number(req.get('x-blink-retry-count')) || 0;
}

function parseIsNewConversation(req) {
  req.isNewConversation = req.keyword || req.broadcast_id;
}

function parseContentfulBroadcast(req, res) {
  let promise = Promise.resolve(false);

  if (req.broadcast_id) {
    promise = helpers.getBroadcast(req, res)
      .then((broadcast) => {
        req.contentfulObjects.broadcast = broadcast;
        return broadcast;
      });
  }
  return promise;
}

function parseContentfulKeyword(req, res) {
  let promise = Promise.resolve(false);

  if (req.keyword) {
    promise = helpers.getKeyword(req, res)
      .then((keyword) => {
        req.contentfulObjects.keyword = keyword;
        return keyword;
      });
  }
  return promise;
}

function parseCampaignId(req) {
  let campaign = {};
  if (req.broadcast_id && req.contentfulObjects.broadcast) {
    campaign = req.contentfulObjects.broadcast.fields.campaign.fields;
  } else if (req.keyword && req.contentfulObjects.keyword) {
    campaign = req.contentfulObjects.keyword.fields.campaign.fields;
  }
  req.campaignId = campaign.campaignId;
}

function parseBroadcastDeclinedMessage(req) {
  let broadcastDeclinedMessage = '';
  if (req.broadcast_id && req.contentfulObjects.broadcast) {
    broadcastDeclinedMessage = req.contentfulObjects.broadcast.fields.declinedMessage;
  }
  req.broadcastDeclinedMessage = broadcastDeclinedMessage;
}

module.exports = function mapRequestParams(config = {}) {
  return (req, res, next) => {
    req.client = config.client;

    /**
     * config.paramsMap is a hash that holds the names of the new req properties that will
     * be parsed from the req.body object.
     */
    Object.keys(config.paramsMap).forEach((param) => {
      let value = req[config.containerProperty][param];

      if (value && param === config.emojiStripParam) {
        value = emojiStrip(value || '');
      }

      if (value && param === config.lowercaseParam) {
        value = value.toLowerCase();
      }

      req[config.paramsMap[param]] = value;
      logger.verbose(`req.${config.paramsMap[param]}=${value}`);
    });

    // sync parsers
    parseRetryCount(req);
    parseIsNewConversation(req);

    // log
    logParams(req);
    addNewRelicParams(req);

    if (req.client !== 'mobilecommons') {
      return next();
    }

    const asyncRequests = [];
    req.contentfulObjects = {};

    // async parsers
    asyncRequests.push(parseContentfulBroadcast(req, res));
    asyncRequests.push(parseContentfulKeyword(req, res));

    // Process async parsers
    return Promise.all(asyncRequests)
      .then(() => {
        // async dependent parsers
        parseCampaignId(req);
        parseBroadcastDeclinedMessage(req);
        next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
