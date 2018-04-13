'use strict';

module.exports = {
  useV3: () => process.env.DS_ROGUE_API_USE_V3 === 'true',
  v2: {
    baseUri: process.env.DS_ROGUE_API_BASEURI,
  },
  v3: {
    baseUri: process.env.DS_ROGUE_API_BASEURI_V3,
  },
  authStrategies: {
    apiKey: {
      credentials: {
        key: process.env.DS_ROGUE_API_KEY,
        header: 'X-DS-Rogue-API-Key',
      },
    },
    clientCredentials: {
      scopes: 'activity write',
      credentials: {
        client: {
          id: process.env.DS_NORTHSTAR_API_OAUTH_CLIENT_ID,
          secret: process.env.DS_NORTHSTAR_API_OAUTH_CLIENT_SECRET,
        },
        auth: {
          tokenHost: process.env.DS_NORTHSTAR_API_OAUTH_TOKEN_HOST,
          tokenPath: process.env.DS_NORTHSTAR_API_OAUTH_TOKEN_PATH,
        },
        options: {
          bodyFormat: 'json',
        },
      },
    },
  },
};
