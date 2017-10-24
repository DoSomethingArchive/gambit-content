'use strict';

function parsePhoenixCampaign(phoenixCampaign) {
  const campaign = {
    id: Number(phoenixCampaign.id),
    title: phoenixCampaign.title,
    status: phoenixCampaign.status,
    current_run: Number(phoenixCampaign.currentCampaignRun.id),
  };
  return campaign;
}

module.exports = function parsePhoenixCampaigns() {
  return (req, res, next) => {
    const data = [];

    req.phoenixCampaigns.forEach((phoenixCampaign) => {
      if (phoenixCampaign.status === 'closed') {
        return;
      }
      const campaign = parsePhoenixCampaign(phoenixCampaign);
      campaign.keywords = req.keywordsByCampaignId[campaign.id];
      data.push(campaign);
    });

    // TODO: Remove this check (and the Mobile Commons Groups middleware) once TGM is live.
    if (req.query.exclude) {
      return res.send({ data });
    }

    req.data = data;
    return next();
  };
};
