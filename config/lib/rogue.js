'use strict';

const enabled = process.env.DS_ROGUE_ENABLED === 'true';

module.exports = {
  apiKeyHeader: 'X-DS-Rogue-API-Key',
  clientOptions: {
    apiKey: process.env.DS_ROGUE_API_BASEURI,
    baseUri: process.env.DS_ROGUE_API_KEY,
  },
  enabled: enabled || true,
};
