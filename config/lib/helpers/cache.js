'use strict';

module.exports = {
  campaigns: {
    name: 'campaigns',
    ttl: parseInt(process.env.GAMBIT_CAMPAIGNS_CACHE_TTL, 10) || 3600,
  },
  defaultTopicTriggers: {
    name: 'defaultTopicTriggers',
    ttl: parseInt(process.env.GAMBIT_DEFAULT_TOPIC_TRIGGERS_CACHE_TTL, 10) || 3600,
  },
  topics: {
    name: 'topics',
    ttl: parseInt(process.env.GAMBIT_TOPICS_CACHE_TTL, 10) || 3600,
  },
};
