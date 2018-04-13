'use strict';

const EventEmitter = require('events');
const camelCase = require('camelcase');

/**
 * RogueClient
 * @extends EventEmitter
 */
class RogueClient extends EventEmitter {
  /**
   * Create a new client
   *
   * @param  {Object} opts
   * @param  {Array} strategies - Auth strategies the client will support
   */
  constructor(opts, strategies) {
    super();
    this.strategies = strategies;
    this.setup();
  }
  /**
   * request - Gets a requet client that is authorized by the strategy named in the strategyName
   * argument. The goal is that each strategy should implement the getAuthorizedClient method.
   *
   * @param  {string} strategyName
   * @return {Object} Authorized client
   */
  request(strategyName) {
    if (!strategyName) {
      throw new Error('RogueClient.request: a strategyName is required');
    }
    return this.availableStrategies[strategyName].getAuthorizedClient();
  }
  /**
   * @static getInstance
   *
   * @param  {Object} opts = {}
   * @param  {Array} strategies = []
   * @return {RogueClient}
   */
  static getInstance(opts = {}, strategies = []) {
    return new RogueClient(opts, strategies);
  }

  /**
   * If JS had private scope, the following methods would be private. -----------------------------\
   * There is hope: @see https://github.com/tc39/proposal-private-methods
   */

  /**
   * setup - Initializes each strategy and creates a map of the camelCased strategy names and the
   * strategy instances.
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
