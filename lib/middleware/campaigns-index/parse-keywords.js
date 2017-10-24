'use strict';

module.exports = function parseKeywords() {
  return (req, res, next) => {
    req.campaigns = {};
    req.keywords.forEach((keywordObj) => {
      const keyword = keywordObj.keyword;
      const campaignId = keywordObj.campaign.fields.campaignId;
      if (!req.campaigns[campaignId]) {
        req.campaigns[campaignId] = {
          id: campaignId,
          keywords: [keyword],
        };
      } else {
        req.campaigns[campaignId].keywords.push(keyword);
      }
    });
    return next();
  };
};
