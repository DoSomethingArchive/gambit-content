'use strict';

const contentful = require('../../contentful');
const helpers = require('../../helpers');

module.exports = function getContentfulKeywords() {
  return (req, res, next) => {
    contentful.fetchKeywords()
      .then((contentfulKeywords) => {
        req.contentfulKeywords = contentfulKeywords;
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
