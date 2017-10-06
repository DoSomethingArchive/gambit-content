'use strict';

/**
 * Imports.
 */
const Promise = require('bluebird');
const superagent = require('superagent');

const defaultConfig = require('../config/lib/rogue');

/**
 * @param {string} endpoint
 * @param {object} data
 */
function executePost(endpoint, data) {
  const url = `${defaultConfig.clientOptions.baseUri}/${endpoint}`;

  return superagent
    .post(url)
    .set(defaultConfig.apiKeyHeader, defaultConfig.clientOptions.apiKey)
    .send(data)
    .then(res => res.body)
    .reject(err => Promise.reject(err));
}

/**
 * @param {object} data
 */
module.exports.createSignup = function (data) {
  return executePost('signups', data);
};

/**
 * @param {object} data
 */
module.exports.createPost = function (data) {
  return executePost('posts', data);
};

module.exports.isEnabled = function () {
  return defaultConfig.enabled;
};
