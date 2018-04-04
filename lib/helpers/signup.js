'use strict';

module.exports = {
  /**
   * @param {Object} req
   * @return {Object}
   */
  getDefaultCreatePayloadFromReq: function getDefaultCreatePayloadFromReq(req) {
    // @see https://github.com/DoSomething/rogue/blob/master/documentation/endpoints/signups.md#signups
    const data = {
      source: req.platform,
      campaign_id: req.campaignId,
      campaign_run_id: req.campaignRunId,
      northstar_id: req.userId,
    };
    return data;
  },
  /**
   * @param {Object} req
   * @return {Object}
   */
  getCreatePhotoPostPayloadFromReq: function getCreatePhotoPostPayloadFromReq(req) {
    const data = this.getDefaultCreatePayloadFromReq(req);
    data.type = 'photo';
    const draft = req.signup.draft_reportback_submission;
    // @see https://github.com/DoSomething/rogue/blob/master/documentation/endpoints/posts.md
    data.quantity = draft.quantity;
    data.caption = draft.caption;
    if (draft.why_participated) {
      data.why_participated = draft.why_participated;
    }
    data.photo = draft.photo;
    return data;
  },
};
