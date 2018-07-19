'use strict';

const helpers = require('../../../helpers');

module.exports = function sendResponse() {
  return (req, res) => {
    try {
      // Remove campaign properties since this list of topics is nested within a campaign response.
      req.topics.forEach((topic) => {
        delete topic.campaign; // eslint-disable-line no-param-reassign
      });
      req.campaign.topics = req.topics;
    } catch (err) {
      return helpers.sendErrorResponse(res, err);
    }

    return helpers.response.sendData(res, req.campaign);
  };
};
