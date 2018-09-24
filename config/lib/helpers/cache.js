'use strict';

module.exports = {
  campaigns: {
    name: 'campaigns',
    ttl: parseInt(process.env.GAMBIT_CAMPAIGNS_CACHE_TTL, 10) || 3600,
  },
  parsedContentfulEntries: {
    name: 'parsedContentfulEntries',
    ttl: parseInt(process.env.GAMBIT_PARSED_CONTENTFUL_ENTRIES_CACHE_TTL, 10) || 3600,
  },
};
