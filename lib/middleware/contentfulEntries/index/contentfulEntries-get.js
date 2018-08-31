'use strict';

const helpers = require('../../../helpers');

module.exports = function getContentfulEntries() {
  return (req, res) => {
    if (!req.query.content_type) {
      return helpers.sendResponse(res, 422, 'content_type query parameter required,');
    }
    // Contentful throws an error when an unknown query parameter is passed, like our apiKey param.
    delete req.query.apiKey;

    return helpers.contentfulEntry.fetch(req.query)
      .then(fetchResult => helpers.response.sendIndexData(res, fetchResult.data, fetchResult.meta))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
