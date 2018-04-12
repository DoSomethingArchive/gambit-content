'use strict';

const logger = require('winston');
const EventEmitter = require('events');

class RogueClient extends EventEmitter {
  constructor(opts, strategy) {
    super();
    if (RogueClient.instance) {
      logger.warn('RogueClient instance already exist');
      return RogueClient.instance;
    }
    this.strategy = strategy;
    RogueClient.instance = this;
    this.setup();
  }
  setup() {
    if (!this.strategy) {
      throw new TypeError('RogueClient: this.strategy is required.');
    }
    this.strategy.setup();
  }

  auth(callback) {
    callback(this.strategy.getAuthToken());
  }

  static getInstance(opts, strategy) {
    return new RogueClient(opts, strategy);
  }
}

module.exports = RogueClient;
