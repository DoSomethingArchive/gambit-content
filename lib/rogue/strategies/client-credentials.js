'use strict';

const oauth2 = require('simple-oauth2');
const logger = require('winston');
const EventEmitter = require('events');

const config = require('../../../config/lib/rogue/rogue-client');

const strategyName = 'clientCredentials';

class ClientCredentials extends EventEmitter {
  constructor() {
    super();
    if (ClientCredentials.instance) {
      logger.warning('ClientCredentials instance already exist');
      return ClientCredentials.instance;
    }
    this.tokenConfig = {};
    this.oauthClient = oauth2.create(config.oauthStrategies[strategyName].credentials);
    ClientCredentials.instance = this;
  }
  static getInstance() {
    const clientCredentials = new ClientCredentials();
    Object.freeze(clientCredentials);
    return clientCredentials;
  }
}

module.exports = ClientCredentials;
