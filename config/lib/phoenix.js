'use strict';

module.exports = {
  cache: {
    ttl: parseInt(process.env.GAMBIT_CAMPAIGNS_CACHE_TTL, 10) || 3600,
  },
  clientOptions: {
    baseUri: process.env.DS_PHOENIX_API_BASEURI || 'https://thor.dosomething.org/api/v1',
  },
};
