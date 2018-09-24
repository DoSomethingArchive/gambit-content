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
const parsedContentfulEntriesCache = new Cacheman(config.parsedContentfulEntries.name, {
  ttl: config.parsedContentfulEntries.ttl,
  engine: redisEngine,
});

function parseSetCacheResponse(res) {
  return JSON.parse(res);
}

module.exports = {
  broadcasts: {
    get: function get(id) {
      return parsedContentfulEntriesCache.get(id);
    },
    set: function set(id, data) {
      return parsedContentfulEntriesCache.set(id, data).then(res => parseSetCacheResponse(res));
    },
  },
  campaignConfigs: {
    get: function get(id) {
      return parsedContentfulEntriesCache.get(`${id}`);
    },
    set: function set(id, data) {
      return parsedContentfulEntriesCache.set(`${id}`, data).then(res => parseSetCacheResponse(res));
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
      return parsedContentfulEntriesCache.get(id);
    },
    set: function set(id, data) {
      return parsedContentfulEntriesCache.set(id, data).then(res => parseSetCacheResponse(res));
    },
  },
  topics: {
    get: function get(id) {
      return parsedContentfulEntriesCache.get(id);
    },
    set: function set(id, data) {
      return parsedContentfulEntriesCache.set(id, data).then(res => parseSetCacheResponse(res));
    },
  },
};
