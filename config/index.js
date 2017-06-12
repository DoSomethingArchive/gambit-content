'use strict';

const underscore = require('underscore');
const configExists = require('file-exists');

const environment = process.env.NODE_ENV || 'development';
const envConfigPath = `${__dirname}/env/${environment}`;
let envConfig = {};

if (configExists.sync(envConfigPath)) {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  envConfig = require(envConfigPath);
}

const defaultConfig = {
  environment,
  port: process.env.PORT || 5000,
  webConcurrency: process.env.WEB_CONCURRENCY || 1,
  dbUri: process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder',
  apiKey: process.env.GAMBIT_API_KEY || 'totallysecret',
};

const configVars = underscore.extend({}, defaultConfig, envConfig);

/**
 * Check that required config vars exist, otherwise kill the Gambit!
 */
configVars.requiredVarsConfigured = require('./required-vars')();

/**
 * Winston Logger setup
 * We don't need to export the Logger. Just require adhoc in whatever file we need it,
 * like: const logger = require('winston');
 */
require('./logger')({
  dbUri: configVars.dbUri,
});

/**
 * Mongo connection setup
 * export mongooseConnection
 */
configVars.mongooseConnection = require('./mongoose')({
  dbUri: configVars.dbUri,
});

module.exports = configVars;
