'use strict';

const helpers = require('../../../helpers');

module.exports = function getContentfulEntry() {
  return (req, res) => helpers.contentfulEntry.getById(req.params.contentfulId)
    .then(data => helpers.response.sendData(res, data))
    .catch(err => helpers.sendErrorResponse(res, err));
};
