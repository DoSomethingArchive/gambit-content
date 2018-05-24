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
// TODO: Create separate or rename config
const topicsCache = new Cacheman(config.campaigns.name, {
  ttl: config.campaigns.ttl,
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
