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
      logger.warn('ClientCredentials instance already exist');
      return ClientCredentials.instance;
    }
    this.tokenConfig = {};
    this.oauthClient = oauth2.create(config.oauthStrategies[strategyName].credentials);
    ClientCredentials.instance = this;
  }

  setup() {
    // Listeners
    this.on('token-set', (token) => {
      this.token = token;
      logger.info('ClientCredentials: token has been set!');
    });
    this.on('token-error', message => logger.error(message));

    // Get token
    return this.getToken()
      .then(token => this.emit('token-set', token))
      .catch(error => this.emit('token-error', `ClientCredentials: Access Token Error: ${error.message}`));
  }

  async getToken() {
    const request = await this.oauthClient.clientCredentials.getToken(this.tokenConfig);
    return this.oauthClient.accessToken.create(request);
  }

  static getInstance() {
    return new ClientCredentials();
  }
}

module.exports = ClientCredentials;
