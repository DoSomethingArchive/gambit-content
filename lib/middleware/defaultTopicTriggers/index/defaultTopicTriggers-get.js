'use strict';

const helpers = require('../../../helpers');

module.exports = function getDefaultTopicTriggers() {
  return (req, res) => helpers.defaultTopicTrigger.getAll()
    .then((defaultTopicTriggers) => {
      const meta = helpers.util.getPagination(defaultTopicTriggers.length);
      return res.send({ meta, data: defaultTopicTriggers });
    })
    .catch(err => helpers.sendErrorResponse(res, err));
};
