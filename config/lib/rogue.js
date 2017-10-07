'use strict';

const enabled = process.env.DS_ROGUE_ENABLED === 'true';

module.exports = {
  apiKeyHeader: 'X-DS-Rogue-API-Key',
  clientOptions: {
    baseUri: process.env.DS_ROGUE_API_BASEURI,
    apiKey: process.env.DS_ROGUE_API_KEY,
  },
  enabled,
};
