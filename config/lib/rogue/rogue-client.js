'use strict';

module.exports = {
  shouldUse: process.env.DS_ROGUE_USE_API_V3,
  options: {
    baseUri: process.env.DS_ROGUE_API_BASEURI_V3,
  },
  oauthStrategies: {
    clientCredentials: {
      credentials: {
        client: {
          id: process.env.DS_ROGUE_OAUTH_CLIENT_ID,
          secret: process.env.DS_ROGUE_OAUTH_CLIENT_SECRET,
        },
        auth: {
          tokenHost: process.env.DS_NORTHSTAR_API_OAUTH_TOKEN_HOST,
          tokenPath: process.env.DS_NORTHSTAR_API_OAUTH_TOKEN_PATH,
        },
      },
    },
  },
};
