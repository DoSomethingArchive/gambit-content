'use strict';

const oauth2 = require('simple-oauth2');
const logger = require('winston');
const EventEmitter = require('events');
const differenceInSeconds = require('date-fns/difference_in_seconds');

const config = require('../../../config/lib/rogue/rogue-client');

const strategyName = 'clientCredentials';

class ClientCredentials extends EventEmitter {
  constructor(opts = {}) {
    super();
    if (ClientCredentials.instance) {
      logger.warn('ClientCredentials instance already exist');
      return ClientCredentials.instance;
    }
    this.tickerInterval = opts.tickerInterval || 1000; // milliseconds
    this.reconnectWaitPeriod = opts.reconnectWaitPeriod || 10000; // milliseconds
    this.autoRenewToken = opts.autoRenewToken || true;
    this.renewWindow = opts.renewWindow || 10; // seconds
    this.maxReconnectAttempts = opts.maxReconnectAttempts || 1;
    this.reconnectAttemps = 0;
    this.tokenConfig = opts.tokenConfig || {};
    this.oauthClient = oauth2.create(config.oauthStrategies[strategyName].credentials);
    ClientCredentials.instance = this;
  }

  setup() {
    // Listeners
    this.on('token-set', () => {
      logger.info('ClientCredentials: token has been set');
      if (this.autoRenewToken && !this.ticker) {
        this.setTicker(this.renewExpiredToken.bind(this));
      }
    });
    this.on('token-error', (error) => {
      logger.error(`ClientCredentials: Access Token Error. Error Message: ${error.message}`);
      this.reconnect();
    });

    // Get and set new token
    return this.renewToken();
  }

  getAuthToken() {
    return this.token.accessToken;
  }

  setToken(accessToken) {
    this.token = accessToken.token;
    this.emit('token-set', this.token);
  }

  renewExpiredToken() {
    const expirationWindow = differenceInSeconds(this.token.expires_at, new Date());
    logger.debug(expirationWindow);
    if (expirationWindow < this.renewWindow) {
      logger.info('renewExpiredToken: Renewing token');
      this.renewToken();
    }
  }

  setTicker(cb) {
    this.ticker = setInterval(() => {
      cb();
    }, this.tickerInterval);
  }

  reconnect() {
    if (this.reconnectAttemps < this.maxReconnectAttempts) {
      logger.warn(`reconnecting: try ${this.reconnectAttemps}`);
      this.renewToken();
      this.reconnectAttemps += 1;
    } else {
      logger.warn(`retries exhausted: trying again in ${this.reconnectWaitPeriod / 1000} seconds`);
      setTimeout(() => {
        this.reconnectAttemps = 0;
        this.renewToken();
      }, this.reconnectWaitPeriod);
    }
  }

  async getAccessToken() {
    const request = await this.oauthClient.clientCredentials.getToken(this.tokenConfig);
    return this.oauthClient.accessToken.create(request);
  }

  async renewToken() {
    try {
      const accessToken = await this.getAccessToken();
      this.setToken(accessToken);
    } catch (error) {
      this.emit('token-error', error);
    }
  }

  static getInstance() {
    return new ClientCredentials();
  }
}

module.exports = ClientCredentials;
