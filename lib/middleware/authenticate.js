'use strict';

const logger = require('winston');
const stathat = require('../../lib/stathat');

module.exports = function authenticateRequest(config = {}) {
  return (req, res, next) => {
    if (req.method === 'GET' && req.url === '/') {
      return next();
    }
    const apiKey = req.get(config.apiKeyHeaderName) || req.query[config.apiKeyQueryName];
    if (apiKey !== config.apiKey) {
      stathat.postStat(`error: invalid ${config.apiKeyHeaderName}`);
      logger.warn(`router invalid ${config.apiKeyHeaderName}:`, req.url);

      return res.sendStatus(403);
    }
    return next();
  };
};
