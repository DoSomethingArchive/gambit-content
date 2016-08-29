"use strict"

/**
 * Helper methods to interface with the DonorsChoose API.
 */

var proposalsHost = 'https://api.donorschoose.org/';
var donationsHost = 'https://apisecure.donorschoose.org/';

if (process.env.NODE_ENV != 'production') {
  proposalsHost = 'https://qa.donorschoose.org/';
  donationsHost = 'https://apiqasecure.donorschoose.org/';
}

module.exports.getProposalsQueryUrl = function(zip, minCostToTcomplete) {
  // @see https://data.donorschoose.org/docs/project-listing/json-requests/
  var url = proposalsHost + 'common/json_feed.html';
  url += '?subject4=-4'; 
  url += '&sortBy=2'; 
  url += '&costToCompleteRange=' + minCostToTcomplete + '+TO+10000'; 
  url += '&max=1';
  url += '&zip=' + zip;
  return url;
}

module.exports.getDonationsPostUrl = function() {
  return donationsHost + 'common/json_api.html';
}
