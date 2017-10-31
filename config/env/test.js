'use strict';

require('dotenv').config();

const dbName = 'ds-mdata-responder-test';
let dbUri = `mongodb://localhost/${dbName}`;
let redisUrl = 'redis://127.0.0.1:6379';

// Running in wercker
if (process.env.MONGO_PORT_27017_TCP_ADDR) {
  dbUri = `mongodb://${process.env.MONGO_PORT_27017_TCP_ADDR}:${process.env.MONGO_PORT_27017_TCP_PORT}/${dbName}`;
}

// Running in wercker
if (process.env.REDIS_PORT_6379_TCP_ADDR) {
  redisUrl = `redis://${process.env.REDIS_PORT_6379_TCP_ADDR}:${process.env.REDIS_PORT_6379_TCP_PORT}`;
}

const configVars = {
  dbUri,
  redisUrl,
};

module.exports = configVars;
