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
    // TODO: Instead of sending our req.query and guessing which params are Contentful specific vs
    // our own parameters, expect a stringified contentfulQuery param.
    // @see https://github.com/DoSomething/gambit-campaigns/pull/1081/files/ca4a6bb034a8758a056b7323cde2d37325f308d4#discussion_r214556063
    delete req.query.apiKey;

    return helpers.contentfulEntry.fetch(req.query)
      .then(fetchResult => helpers.response.sendIndexData(res, fetchResult.data, fetchResult.meta))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
