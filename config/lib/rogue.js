'use strict';

module.exports = {
  apiKeyHeader: 'X-DS-Rogue-API-Key',
  clientOptions: {
    baseUri: process.env.DS_ROGUE_API_BASEURI,
    apiKey: process.env.DS_ROGUE_API_KEY,
  },
  source: process.env.DS_API_POST_SOURCE || 'sms-mobilecommons',
};
