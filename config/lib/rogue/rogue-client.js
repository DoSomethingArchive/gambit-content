'use strict';

module.exports = {
  v2: {
    baseUri: process.env.DS_ROGUE_API_BASEURI,
  },
  v3: {
    baseUri: process.env.DS_ROGUE_API_BASEURI_V3,
  },
  authStrategies: {
    apiKey: {
      apiVersion: 'v2',
      credentials: {
        key: process.env.DS_ROGUE_API_KEY,
        header: 'X-DS-Rogue-API-Key',
      },
    },
    clientCredentials: {
      apiVersion: 'v3',
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
