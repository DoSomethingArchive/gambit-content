'use strict';

const emojiStrip = require('emoji-strip');
const newrelic = require('newrelic');
const logger = require('winston');

const stathat = require('../../lib/stathat');

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

module.exports = function mapRequestParams(config = {}) {
  return (req, res, next) => {
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

    logParams(req);
    addNewRelicParams(req);

    return next();
  };
};
