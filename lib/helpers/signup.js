'use strict';

function getDefaultCreatePayloadFromReq(req) {
  // @see https://github.com/DoSomething/rogue/blob/master/documentation/endpoints/signups.md#signups
  const data = {
    source: req.platform,
    campaign_id: req.campaignId,
    campaign_run_id: req.campaignRunId,
    northstar_id: req.userId,
  };
  return data;
}

module.exports = {
  getDefaultCreatePayloadFromReq,
};
