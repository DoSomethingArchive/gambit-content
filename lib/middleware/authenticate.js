'use strict';

const logger = require('winston');

module.exports = function authenticateRequest(config = {}) {
  return (req, res, next) => {
    if (req.method === 'GET' && req.url === '/') {
      return next();
    }
    const apiKey = req.get(config.apiKeyHeaderName) || req.query[config.apiKeyQueryName];
    if (apiKey !== config.apiKey) {
      logger.warn(`router invalid ${config.apiKeyHeaderName}:`, req.url);

      return res.sendStatus(403);
    }
    return next();
  };
};
