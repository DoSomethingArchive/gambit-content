'use strict';

/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */

// Wrapper around require to set relative path at app root
global.rootRequire = function (name) {
  return require(`../${name}`);
};

const configVars = {};
configVars.environment = process.env.NODE_ENV || 'development';
configVars.port = process.env.PORT || 5000;
configVars.webConcurrency = process.env.WEB_CONCURRENCY || 1;
configVars.dbUri = process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder';

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
