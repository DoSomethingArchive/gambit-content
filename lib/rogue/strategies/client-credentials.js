'use strict';

const oauth2 = require('simple-oauth2');
const logger = require('winston');
const EventEmitter = require('events');
const superagent = require('superagent-use')(require('superagent'));
const differenceInSeconds = require('date-fns/difference_in_seconds');

const config = require('../../../config/lib/rogue/rogue-client');

class ClientCredentials extends EventEmitter {
  constructor(opts = {}) {
    // If there is an instance of self already, return that
    if (ClientCredentials.instance) {
      logger.warn('ClientCredentials: instance already exist');
      return ClientCredentials.instance;
    }
    super();
    // Amount of milliseconds to wait before checking if we need to renew the token
    this.tickerInterval = opts.tickerInterval || 1000;
    /**
     * If we can't renew the token in maxReconnectAttempts retries, wait this many milliseconds
     * before trying to reconnect again
     */
    this.reconnectWaitPeriod = opts.reconnectWaitPeriod || 10000; // milliseconds
    /**
     * Should the token be preemptively renewed?
     * In the case of Northstar we Should, because it sends 'expires_in' instead of 'expires_at'
     * generating a possible race condition. Described below.
     * @see https://www.npmjs.com/package/simple-oauth2#access-token-object
     */
    this.autoRenewToken = opts.autoRenewToken || true;
    // How many seconds before the token expires we should attempt to renew?
    this.renewWindow = opts.renewWindow || 60;
    // Maximum amount of linear retries to attemp before a waiting period
    this.maxReconnectAttempts = opts.maxReconnectAttempts || 1;
    // It increses while attempting to reconnect
    this.reconnectAttemps = 0;
    // We might need in order to ask for specific scopes
    this.tokenConfig = opts.tokenConfig || {};
    this.oauthClient = oauth2.create(config.authStrategies.clientCredentials.credentials);
    // Store reference of self
    ClientCredentials.instance = this;
  }

  setup() {
    // Listeners
    this.on('token-set', () => {
      logger.info('ClientCredentials.setup: token has been set');
      if (this.autoRenewToken && !this.ticker) {
        this.setTicker(this.renewExpiredToken.bind(this));
      }
      // Some cleanup, maybe move to cleanup method?
      this.reconnectAttemps = 0;
    });
    this.on('token-error', (error) => {
      logger.error(`ClientCredentials.setup: Access Token Error. Error Message: ${error.message}`);
      this.reconnect();
    });

    // Get and set new token
    return this.renewToken();
  }

  getAuthorizedClient() {
    return superagent.use((req) => {
      req.set('Authorization', `Bearer ${this.token.accessToken}`);
    });
  }

  static getInstance() {
    return new ClientCredentials();
  }

  /**
   * If JS had private scope, the following methods would be private. -----------------------------\
   */

  setToken(accessToken) {
    this.token = accessToken.token;
    this.emit('token-set', this.token);
  }

  renewExpiredToken() {
    const expirationWindow = differenceInSeconds(this.token.expires_at, new Date());
    if (expirationWindow < this.renewWindow) {
      logger.info('ClientCredentials.renewExpiredToken: Renewing token');
      this.clearTicker();
      this.renewToken();
    }
  }

  setTicker(cb) {
    this.ticker = setInterval(cb, this.tickerInterval);
  }

  clearTicker() {
    // Stop inteval as soon as possible
    process.nextTick(() => {
      clearInterval(this.ticker);
      this.ticker = undefined;
    });
  }

  reconnect() {
    if (this.reconnectAttemps < this.maxReconnectAttempts) {
      logger.warn(`ClientCredentials.reconnect: reconnecting attempt #${this.reconnectAttemps}`);
      this.renewToken();
      this.reconnectAttemps += 1;
    } else {
      logger.warn(`ClientCredentials.reconnect: retries exhausted, waiting ${this.reconnectWaitPeriod / 1000} seconds`);
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

  // End "private" methods ------------------------------------------------------------------------/
}

module.exports = ClientCredentials;
