'use strict';

const EventEmitter = require('events');
const camelCase = require('camelcase');

class RogueClient extends EventEmitter {
  constructor(opts, strategies) {
    super();
    this.strategies = strategies;
    this.setup();
  }

  request(strategyName) {
    return this.availableStrategies[strategyName].getAuthorizedClient();
  }

  static getInstance(opts = {}, strategies = []) {
    return new RogueClient(opts, strategies);
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
