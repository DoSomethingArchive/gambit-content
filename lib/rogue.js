'use strict';

/**
 * Imports.
 */
const logger = require('winston');
const superagent = require('superagent');

const defaultConfig = require('../config/lib/rogue');

function executePost(endpoint, data) {
  const uri = `${this.options.baseUri}/${endpoint}`;

  return superagent
    .post(url)
    .set('X-DS-Rogue-API-Key', defaultConfig.apiKey)
    .send(data);
};

module.exports.createSignup = function (data) {
  return executePost('signups', data);
};

module.exports.createPost = function (data) {
  return executePost('posts', data);
};
