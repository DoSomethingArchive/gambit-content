'use strict';

const { RogueClient } = require('@dosomething/gateway/server');

let rogueClient;

function getClient() {
  if (!rogueClient) {
    rogueClient = RogueClient.getNewInstance();
  }
  return rogueClient;
}
/**
 * createPost
 *
 * @param {object} data
 * @return {Promise}
 */
function createPost(data) {
  return getClient().Posts.create(data);
}
/**
 * createSignup
 *
 * @param {object} data
 * @return {Promise}
 */
function createSignup(data) {
  return getClient().Signups.create(data);
}

/**
 * fetchSignups
 *
 * @param {Object} query
 * @return {Promise}
 */
function fetchSignups(query) {
  return getClient().Signups.index(query);
}

function getConfig() {
  return getClient().config;
}

module.exports = {
  getConfig,
  getClient,
  createPost,
  createSignup,
  fetchSignups,
};
