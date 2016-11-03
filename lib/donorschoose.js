'use strict';

/**
 * Helper methods to interface with the DonorsChoose API.
 * @see https://data.donorschoose.org/docs/project-listing/json-requests/
 */
const Entities = require('html-entities').AllHtmlEntities;
let proposalsHost = 'https://api.donorschoose.org/';
let donationsHost = 'https://apisecure.donorschoose.org/';

if (process.env.NODE_ENV !== 'production') {
  proposalsHost = 'https://qa.donorschoose.org/';
  donationsHost = 'https://apiqasecure.donorschoose.org/';
}

/**
 * Decodes proposal response object returned from DonorsChoose API.
 * @param {object} proposal
 * @return {object}
 */
module.exports.decodeProposal = function (proposal) {
  const entities = new Entities();

  return {
    id: proposal.id,
    fulfillmentTrailer: entities.decode(proposal.fulfillmentTrailer),
    city: entities.decode(proposal.city),
    state: entities.decode(proposal.state),
    schoolName: entities.decode(proposal.schoolName),
    teacherName: entities.decode(proposal.teacherName),
    url: proposal.proposalURL,
  };
};

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
