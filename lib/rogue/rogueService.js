'use strict';

const logger = require('winston');
const EventEmitter = require('events');

class RogueClient extends EventEmitter {
  constructor(opts, strategy) {
    super();

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
}

module.exports.getSingleton = function getSingleton(opts, strategy) {
  const rogueClient = new RogueClient(opts, strategy);
  Object.freeze(rogueClient);
  return rogueClient;
};

module.exports.getInstance = (opts, strategy) => exports.getSingleton(opts, strategy);

/**
 * Exposed for testing purposes only ------------
 */

/**
 * Implementation should use getInstance in order to receive the
 * singleton.
 */
module.exports.RogueClient = RogueClient;
