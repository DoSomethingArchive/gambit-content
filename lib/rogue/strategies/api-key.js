'use strict';

const logger = require('winston');
const EventEmitter = require('events');
const superagent = require('superagent-use')(require('superagent'));

const config = require('../../../config/lib/rogue/rogue-client');

class ApiKeyCredentials extends EventEmitter {
  constructor() {
    if (ApiKeyCredentials.instance) {
      logger.warn('ApiKeyCredentials: instance already exist');
      return ApiKeyCredentials.instance;
    }
    super();
    this.credentials = config.authStrategies.apiKey.credentials;
    ApiKeyCredentials.instance = this;
  }

  setup() {
    if (!this.credentials.header) {
      throw new TypeError('ApiKeyCredentials.setup: this.credentials.header is required.');
    }
    if (!this.credentials.key) {
      throw new TypeError('ApiKeyCredentials.setup: this.credentials.key is required.');
    }
  }

  getAuthorizedClient() {
    return superagent.use((req) => {
      req.set(this.credentials.header, this.credentials.key);
    });
  }

  static getInstance() {
    return new ApiKeyCredentials();
  }
}

module.exports = ApiKeyCredentials;
