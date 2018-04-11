'use strict';

module.exports = {
  shouldUse: process.env.DS_ROGUE_USE_API_V3,
  options: {
    baseUri: process.env.DS_ROGUE_API_BASEURI_V3,
  },
};
