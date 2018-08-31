'use strict';

const helpers = require('../../../helpers');
const UnprocessibleEntityError = require('../../../../app/exceptions/UnprocessibleEntityError');

module.exports = function getContentfulEntries() {
  return (req, res) => {
    if (!req.query.content_type) {
      const errorMessage = 'content_type query parameter required.';
      return helpers.sendErrorResponse(res, new UnprocessibleEntityError(errorMessage));
    }
    // Contentful throws an error when an unknown query parameter is passed, like our apiKey param.
    delete req.query.apiKey;

    return helpers.contentfulEntry.fetch(req.query)
      .then(fetchResult => helpers.response.sendIndexData(res, fetchResult.data, fetchResult.meta))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
