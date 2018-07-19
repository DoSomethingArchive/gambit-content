'use strict';

const helpers = require('../../../helpers');

module.exports = function getDefaultTopicTriggers() {
  return (req, res) => helpers.defaultTopicTrigger.getAll()
    .then((defaultTopicTriggers) => {
      // Our cached list doesn't contain the meta property, so we'll calculate it here.
      // We will eventually need to support pagination once our list of triggers grows, but we need
      // each page cached, as a Conversations restart requires all available triggers when loading
      // the Rivescript bot on app start.
      const meta = helpers.util.getMeta(defaultTopicTriggers.length);
      return helpers.response.sendDataAndMeta(res, defaultTopicTriggers, meta);
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
