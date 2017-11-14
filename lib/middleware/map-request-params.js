'use strict';

const newrelic = require('newrelic');
const logger = require('winston');

function logParams(req) {
  const incomingParams = {
    phone: req.body.phone,
    incoming_message: req.incoming_message,
    incoming_image_url: req.incoming_image_url,
    broadcast_id: req.broadcast_id,
    keyword: req.keyword,
  };
  logger.info(incomingParams);
}

function addNewRelicParams(req) {
  newrelic.addCustomParameters({
    incomingImageUrl: req.incoming_image_url,
    incomingMessage: req.incoming_message,
    keyword: req.keyword,
    broadcastId: req.broadcast_id,
  });
}

function parseIsNewConversation(req) {
  req.isNewConversation = req.keyword || req.broadcast_id;
}

module.exports = function mapRequestParams(config = {}) {
  return (req, res, next) => {
    // TODO: Eventually deprecate client.
    req.client = config.client;

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

    parseIsNewConversation(req);

    // log
    logParams(req);
    addNewRelicParams(req);

    return next();
  };
};
