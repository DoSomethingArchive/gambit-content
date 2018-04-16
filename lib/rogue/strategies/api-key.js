'use strict';

const EventEmitter = require('events');
const superagent = require('superagent-use')(require('superagent'));

const config = require('../../../config/lib/rogue/rogue-client');

/**
 * ApiKeyCredentials
 * @extends EventEmitter
 */
class ApiKeyCredentials extends EventEmitter {
  // Create a new api key authentication strategy
  constructor() {
    super();
    this.credentials = config.authStrategies.apiKey.credentials;
  }
  // validates the existence of header and key credentials
  setup() {
    if (!this.credentials.header) {
      throw new TypeError('ApiKeyCredentials.setup: this.credentials.header is required.');
    }
    if (!this.credentials.key) {
      throw new TypeError('ApiKeyCredentials.setup: this.credentials.key is required.');
    }
  }
  /**
   * getAuthorizedClient - Sets the Authorization header and api key in the superagent client.
   *                       All the requests sent through this client will use this header.
   *
   * @return {Object}  authenticated superagent client
   */
  getAuthorizedClient() {
    return superagent.use((req) => {
      req.set(this.credentials.header, this.credentials.key);
    });
  }
  /**
   * @static getInstance
   *
   * @return {ApiKeyCredentials}
   */
  static getInstance() {
    return new ApiKeyCredentials();
  }
}

module.exports = ApiKeyCredentials;
