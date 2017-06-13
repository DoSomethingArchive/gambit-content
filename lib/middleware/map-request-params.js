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

function getCampaignFromContentfulObject(object) {
  return object.fields.campaign.fields;
}

// TODO: The containerProperty for the contenful object should probably be in the config file
function parseBroadcast(req, res) {
  let promise = Promise.resolve(false);

  if (req.broadcast_id) {
    promise = helpers.getBroadcast(req, res)
      .then((broadcast) => {
        req.broadcastContentfulObject = broadcast;
        return broadcast;
      });
  }
  return promise;
}

// TODO: The containerProperty for the contenful object should probably be in the config file
function parseKeyword(req, res) {
  let promise = Promise.resolve(false);

  if (req.keyword) {
    promise = helpers.getKeyword(req, res)
      .then((keyword) => {
        req.keywordContentfulObject = keyword;
        return keyword;
      });
  }
  return promise;
}

function parseCampaignId(req) {
  if (req.broadcast_id && req.broadcastContentfulObject) {
    const broadcastCampaign = getCampaignFromContentfulObject(req.broadcastContentfulObject);
    req.campaignId = broadcastCampaign.campaignId;
  } else if (req.keyword && req.keywordContentfulObject) {
    const keywordCampaign = getCampaignFromContentfulObject(req.keywordContentfulObject);
    req.campaignId = keywordCampaign.campaignId;
  }
}

module.exports = function mapRequestParams(config = {}) {
  return (req, res, next) => {
    const asyncRequests = [];
    req.client = config.client;

    Object.keys(config.paramsMap).forEach((param) => {
      let value = req[config.containerProperty][param];

      if (value && param === config.emojiStripParam) {
        value = emojiStrip(value || '');
      }

      if (value && param === config.lowercaseParam) {
        value = value.toLowerCase();
      }

      req[config.paramsMap[param]] = value;
    });

    // sync parsers
    parseRetryCount(req);

    // async parsers
    asyncRequests.push(parseBroadcast(req, res));
    asyncRequests.push(parseKeyword(req, res));

    // log
    logParams(req);
    addNewRelicParams(req);

    // Process async parsers
    return Promise.all(asyncRequests)
      .then(() => {
        // async dependent parsers
        parseCampaignId(req, res);
        next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
