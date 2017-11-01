'use strict';

const redis = require('redis');
const logger = require('winston');

let redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Running in wercker
if (process.env.REDIS_PORT_6379_TCP_ADDR) {
  redisUrl = `redis://${process.env.REDIS_PORT_6379_TCP_ADDR}:${process.env.REDIS_PORT_6379_TCP_PORT}`;
}

module.exports = function getRedisClient() {
  const client = redis.createClient(redisUrl);

  client.on('error', (error) => {
    logger.error(`Redis connection error: ${error}`);
    throw error;
  });

  return client;
};
