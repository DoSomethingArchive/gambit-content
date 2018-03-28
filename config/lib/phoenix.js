'use strict';

const useAshes = process.env.GAMBIT_CAMPAIGNS_SOURCE === 'ashes';
let baseUri;

if (useAshes) {
  const defaultUrl = 'https://www.dosomething.org/api/v1';
  baseUri = process.env.DS_ASHES_API_BASEURI || defaultUrl;
} else {
  const defaultUrl = 'https://ds-phoenix-production.herokuapp.com/api/v2';
  baseUri = process.env.DS_CAMPAIGNS_API_BASEURI || defaultUrl;
}

module.exports = {
  cache: {
    ttl: parseInt(process.env.GAMBIT_CAMPAIGNS_CACHE_TTL, 10) || 3600,
  },
  clientOptions: {
    baseUri,
  },
  useAshes,
};
