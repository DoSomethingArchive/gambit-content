'use strict';

module.exports = {
  // TODO: remove when we fully switch to Rogue V3
  useV3: () => process.env.DS_ROGUE_API_USE_V3 === 'true',
  v2: {
    // TODO: take out of the v2 property when we fully switch to Rogue V3
    baseUri: process.env.DS_ROGUE_API_BASEURI,
  },
  // TODO: remove when we fully switch to Rogue V3
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
      /**
       * admin write - required to create signups with client credentials flow, otherwise signups
       *               will be created with an empty northstar_id. This is an edgecase that the
       *               Rogue team is already aware of.
       * activity    - required to retrieve user's signup activity.
       */
      scopes: 'admin activity write',
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
