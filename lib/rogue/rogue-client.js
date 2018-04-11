'use strict';

const logger = require('winston');

class RogueClient {
  constructor(opts, strategy) {
    if (RogueClient.instance) {
      logger.warning('RogueClient instance already exist');
      return RogueClient.instance;
    }
    this.baseUri = opts.baseUri;
    this.strategy = strategy;
    RogueClient.instance = this;
    this.setup();
  }
  setup() {
    if (!this.strategy) {
      throw new Error('The Rogue Service requires a valid strategy');
    }
  }
  static getInstance(opts, strategy) {
    const rogueClient = new RogueClient(opts, strategy);
    Object.freeze(rogueClient);
    return rogueClient;
  }
}

module.exports = RogueClient;
