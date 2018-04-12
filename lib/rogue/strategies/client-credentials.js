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
    this.autoRenew = opts.autoRenew || true;
    this.renewWindow = opts.renewWindow || 10; // seconds
    this.reconnectAttemps = opts.reconnectAttemps || 1;
    this.reconnectTries = 0;
    this.tokenConfig = opts.tokenConfig || {};
    this.oauthClient = oauth2.create(config.oauthStrategies[strategyName].credentials);
    ClientCredentials.instance = this;
  }

  setup() {
    // Listeners
    this.on('token-set', () => logger.info('ClientCredentials: token has been set!'));
    this.on('token-error', (error) => {
      logger.error(`ClientCredentials: Access Token Error. Error Message: ${error.message}`);
      this.reconnect();
    });

    // Get and set new token
    return this.renewToken(this.autoRenew);
  }

  setToken(accessToken, autoRenew) {
    this.token = accessToken.token;
    this.emit('token-set', accessToken);

    if (autoRenew) {
      this.setTicker(this.renewExpiredToken.bind(this));
    }
  }

  renewExpiredToken() {
    const expirationWindow = differenceInSeconds(this.token.expires_at, new Date());
    if (expirationWindow < this.renewWindow) {
      logger.info('renewExpiredToken: Renewing token');
      this.renewToken(this.autoRenew);
    }
  }

  setTicker(cb) {
    if (this.ticker) {
      clearInterval(this.ticker);
    }
    this.ticker = setInterval(() => {
      cb();
    }, this.tickerInterval);
  }

  reconnect() {
    if (this.reconnectTries < this.reconnectAttemps) {
      logger.warn(`reconnecting: try ${this.reconnectTries}`);
      this.renewToken(this.autoRenew);
      this.reconnectTries += 1;
    } else {
      logger.warn(`retries exhausted: trying again in ${this.reconnectWaitPeriod / 1000} seconds`);
      setTimeout(() => {
        this.reconnectTries = 0;
        this.renewToken(this.autoRenew);
      }, this.reconnectWaitPeriod);
    }
  }

  async getAccessToken() {
    const request = await this.oauthClient.clientCredentials.getToken(this.tokenConfig);
    return this.oauthClient.accessToken.create(request);
  }

  async renewToken(autoRenew) {
    try {
      const accessToken = await this.getAccessToken();
      this.setToken(accessToken, autoRenew);
    } catch (error) {
      this.emit('token-error', error);
    }
  }

  static getInstance() {
    return new ClientCredentials();
  }
}

module.exports = ClientCredentials;
