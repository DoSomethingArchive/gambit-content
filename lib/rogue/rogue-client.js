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
    this.tokenReady = false;
    this.baseUri = opts.baseUri;
    this.strategy = strategy;
    RogueClient.instance = this;
    this.setup();
  }
  setup() {
    if (!this.strategy || !(this.strategy instanceof EventEmitter)) {
      throw new Error('The Rogue Service requires a valid strategy');
    }

    // Listeners
    this.strategy.on('token-set', () => {
      logger.info('RogueClient: token is ready!');
      this.tokenReady = true;
    });

    this.strategy.setup();
  }
  static getInstance(opts, strategy) {
    return new RogueClient(opts, strategy);
  }
}

module.exports = RogueClient;
