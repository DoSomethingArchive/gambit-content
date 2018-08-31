'use strict';

const contentful = require('../../../contentful');
const helpers = require('../../../helpers');

module.exports = function getContentfulEntries() {
  return (req, res) => {
    const query = req.query;
    // Contentful throws an error when an unknown query parameter is passed, like our apiKey param.
    delete query.apiKey;

    return contentful.fetchEntries(req.query)
      .then(fetchResult => helpers.response.sendIndexData(res, fetchResult.data, fetchResult.meta))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
