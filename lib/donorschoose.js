'use strict';

/**
 * Imports.
 */
const superagent = require('superagent');
const Entities = require('html-entities').AllHtmlEntities;
const logger = app.locals.logger;

// TODO: Refactor as env variables:
let proposalsHost = 'https://api.donorschoose.org/';
let donationsHost = 'https://apisecure.donorschoose.org/';

if (process.env.NODE_ENV !== 'production') {
  proposalsHost = 'https://qa.donorschoose.org/';
  donationsHost = 'https://apiqasecure.donorschoose.org/';
}

/**
 * Helper function to parse a DonorsChoose API response.
 */
function parseResponse(response) {
  if (!response.text) {
    throw new Error('Cannot parse DonorsChoose API get response.');
  }

  return JSON.parse(response.text);
}

/**
 * Helper function to execute GET request to given DonorsChoose API uri with given query.
 */
module.exports.get = function (uri, query) {
  logger.debug('donorschoose.get');

  return superagent
    .get(uri)
    .query(query)
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json')
    .then(response => parseResponse(response))
    .catch(err => logger.error(err.message));
};

/**
 * Helper function to execute POST request to given DonorsChoose API uri with given data.
 */
module.exports.post = function (uri, data) {
  logger.debug('donorschoose.post');

  return superagent.post(uri)
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json')
    .type('form')
    .send(data)
    .then(response => parseResponse(response))
    .catch(err => logger.error(err.message));
};

/**
 * Decodes proposal response object returned from DonorsChoose API.
 * @param {object} proposal
 * @return {object}
 */
module.exports.decodeProposal = function (proposal) {
  const entities = new Entities();

  const data = {
    id: proposal.id,
    fulfillmentTrailer: entities.decode(proposal.fulfillmentTrailer),
    city: entities.decode(proposal.city),
    state: entities.decode(proposal.state),
    schoolName: entities.decode(proposal.schoolName),
    teacherName: entities.decode(proposal.teacherName),
    url: proposal.proposalURL,
  };

  return data;
};

// TODO: Remove code below once /v1/donorschoosebot endpoint is live.

/**
 * Returns DonorsChoose API url to post Donations to.
 * @return {string}
 */
module.exports.getDonationsPostUrl = function () {
  return `${donationsHost}common/json_api.html`;
};

/**
 * Returns DonorsChoose API url to query for first Project found by given zip.
 * @param {string} zip
 * @param {integer} minCostToComplete
 * @param {integer} olderThan
 * @return {string}
 */
module.exports.getProposalsQueryUrl = function (zip, minCostToComplete, olderThan) {
  let url = `${proposalsHost}common/json_feed.html`;
  // Subject hardcoded for STEM.
  url = `${url}?subject4=-4&sortBy=2&max=1&zip=${zip}`;
  url = `${url}&costToCompleteRange=${minCostToComplete}+TO+10000`;
  if (olderThan) {
    url = `${url}&olderThan=${olderThan}`;
  }

  return url;
};
