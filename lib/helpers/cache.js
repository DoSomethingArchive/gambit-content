'use strict';

const Cacheman = require('cacheman');
const RedisEngine = require('cacheman-redis');
const redisClient = require('../../config/redis')();
const config = require('../../config/lib/helpers/cache');

const redisEngine = new RedisEngine(redisClient);
const campaignsCache = new Cacheman(config.campaigns.name, {
  ttl: config.campaigns.ttl,
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

module.exports = {
  campaigns: {
    get: function get(id) {
      return campaignsCache.get(id);
    },
    set: function set(id, data) {
      return campaignsCache.set(id, data);
    },
  },
  defaultTopicTriggers: {
    get: function get(id) {
      return defaultTopicTriggersCache.get(id);
    },
    set: function set(id, data) {
      return defaultTopicTriggersCache.set(id, data)
        .then(() => Promise.resolve(data))
        .catch(err => Promise.reject(err));
    },
  },
  topics: {
    get: function get(id) {
      return topicsCache.get(id);
    },
    set: function set(id, data) {
      return topicsCache.set(id, data)
        .then(() => Promise.resolve(data))
        .catch(err => Promise.reject(err));
    },
  },
};
