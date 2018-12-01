'use strict';

const logger = require('winston');
const { RogueClient } = require('@dosomething/gateway/server');

let rogueClient;

function getClient() {
  if (!rogueClient) {
    rogueClient = RogueClient.getNewInstance();
  }
  return rogueClient;
}

/**
 * TODO: Add getCampaign function once Rogue campaigns go live.
 * @see https://github.com/DoSomething/infrastructure/issues/61
 */

module.exports = {
  getClient,
};
