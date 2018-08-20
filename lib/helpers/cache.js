'use strict';

const Cacheman = require('cacheman');
const RedisEngine = require('cacheman-redis');
const redisClient = require('../../config/redis')();
const config = require('../../config/lib/helpers/cache');

const redisEngine = new RedisEngine(redisClient);
const broadcastsCache = new Cacheman(config.broadcasts.name, {
  ttl: config.broadcasts.ttl,
  engine: redisEngine,
});
const campaignsCache = new Cacheman(config.campaigns.name, {
  ttl: config.campaigns.ttl,
  engine: redisEngine,
});
const campaignConfigsCache = new Cacheman(config.campaignConfigs.name, {
  ttl: config.campaignConfigs.ttl,
  engine: redisEngine,
});
const defaultTopicTriggersCache = new Cacheman(config.defaultTopicTriggers.name, {
  ttl: config.defaultTopicTriggers.ttl,
  engine: redisEngine,
});
const topicsCache = new Cacheman(config.topics.name, {
  ttl: config.topics.ttl,
  engine: redisEngine,
});

function parseSetCacheResponse(res) {
  return JSON.parse(res);
}

module.exports = {
  broadcasts: {
    get: function get(id) {
      return broadcastsCache.get(id);
    },
    set: function set(id, data) {
      return broadcastsCache.set(id, data).then(res => parseSetCacheResponse(res));
    },
  },
  campaignConfigs: {
    get: function get(id) {
      return campaignConfigsCache.get(`${id}`);
    },
    set: function set(id, data) {
      return campaignConfigsCache.set(`${id}`, data).then(res => parseSetCacheResponse(res));
    },
  },
  campaigns: {
    get: function get(id) {
      return campaignsCache.get(`${id}`);
    },
    set: function set(id, data) {
      return campaignsCache.set(`${id}`, data).then(res => parseSetCacheResponse(res));
    },
  },
  defaultTopicTriggers: {
    get: function get(id) {
      return defaultTopicTriggersCache.get(id);
    },
    set: function set(id, data) {
      return defaultTopicTriggersCache.set(id, data).then(res => parseSetCacheResponse(res));
    },
  },
  topics: {
    get: function get(id) {
      return topicsCache.get(id);
    },
    set: function set(id, data) {
      return topicsCache.set(id, data).then(res => parseSetCacheResponse(res));
    },
  },
};
