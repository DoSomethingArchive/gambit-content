'use strict';

const newrelic = require('newrelic');
const logger = require('winston');

function logParams(req) {
  const params = {
    userId: req.userId,
    campaignId: req.campaignId,
    campaignRunId: req.campaignRunId,
    messageMediaUrl: req.incoming_image_url,
    messageText: req.incoming_message,
    keyword: req.keyword,
    broadcastId: req.broadcast_id,
    platform: req.platform,
  };
  newrelic.addCustomParameters(params);
  logger.info(params);
}

function parseAskNextQuestion(req) {
  req.askNextQuestion = req.keyword || req.broadcast_id;
}

module.exports = function mapRequestParams(config = {}) {
  return (req, res, next) => {
    /**
     * config.paramsMap is a hash that holds the names of the new req properties that will
     * be parsed from the req.body object.
     */
    Object.keys(config.paramsMap).forEach((param) => {
      let value = req[config.containerProperty][param];

      if (value && param === config.lowercaseParam) {
        value = value.toLowerCase();
      }

      req[config.paramsMap[param]] = value;
      logger.verbose(`req.${config.paramsMap[param]}=${value}`);
    });

    parseAskNextQuestion(req);
    logParams(req);

    return next();
  };
};
