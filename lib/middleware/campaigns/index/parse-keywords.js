'use strict';

module.exports = function parseKeywords() {
  return (req, res, next) => {
    req.keywordsByCampaignId = {};

    req.contentfulKeywords.forEach((keywordObj) => {
      const keyword = keywordObj.keyword;
      const campaignId = keywordObj.campaign.fields.campaignId;

      if (!req.keywordsByCampaignId[campaignId]) {
        req.keywordsByCampaignId[campaignId] = [keyword];
      } else {
        req.keywordsByCampaignId[campaignId].push(keyword);
      }
    });
    return next();
  };
};
