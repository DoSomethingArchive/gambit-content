'use strict';

module.exports = {
  campaigns: {
    name: 'campaigns',
    ttl: parseInt(process.env.GAMBIT_CAMPAIGNS_CACHE_TTL, 10) || 3600,
  },
  contentfulEntries: {
    name: 'contentfulEntries',
    ttl: parseInt(process.env.GAMBIT_CONTENTFUL_ENTRIES_CACHE_TTL, 10) || 3600,
  },
};
