'use strict';

const logger = require('winston');
const EventEmitter = require('events');
const camelCase = require('camelcase');

class RogueClient extends EventEmitter {
  constructor(strategies) {
    super();
    if (RogueClient.instance) {
      logger.warn('RogueClient: instance already exist');
      return RogueClient.instance;
    }
    this.strategies = strategies;
    RogueClient.instance = this;
    this.setup();
  }

  request(strategyName) {
    return this.availableStrategies[strategyName].getAuthorizedClient();
  }

  static getInstance(opts, strategy) {
    return new RogueClient(opts, strategy);
  }

  /**
   * If JS had private scope, the following methods would be private. -----------------------------\
   * There is hope: @see https://github.com/tc39/proposal-private-methods
   */

  setup() {
    if (!Array.isArray(this.strategies) || this.strategies.length < 1) {
      throw new Error('RogueClient.setup: no strategies detected');
    }
    this.availableStrategies = {};
    this.strategies.forEach((strategy) => {
      const name = camelCase(strategy.constructor.name);
      this.availableStrategies[name] = strategy;
      strategy.setup();
    });
  }
  // End "private" methods ------------------------------------------------------------------------/
}

module.exports = RogueClient;
