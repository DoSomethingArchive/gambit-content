'use strict';

const superagent = require('superagent');
const logger = require('winston');
const rogue = require('../rogue');

module.exports = {
  createPhotoPostFromReq: function createPhotoPostFromReq(req) {
    const data = this.getCreatePhotoPostPayloadFromReq(req);
    logger.debug('createPhotoPostFromReq', { data });
    return this.fetchFileStringFromPhotoUrl(data.photoUrl)
      .then((fileString) => {
        data.file = fileString;
        return rogue.createPost(data);
      });
  },
  createTextPostFromReq: function createTextPostFromReq(req) {
    const data = this.getCreateTextPostPayloadFromReq(req);
    return rogue.createPost(data);
  },
  createSignupFromReq: function createSignupFromReq(req) {
    const data = this.getDefaultCreatePayloadFromReq(req);
    return rogue.createSignup(data);
  },
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
    data.photoUrl = draft.photo;
    logger.debug('getCreatePhotoPostPayloadFromReq', data);
    return data;
  },
  getCreateTextPostPayloadFromReq: function getCreatePhotoPostPayloadFromReq(req) {
    const data = this.getDefaultCreatePayloadFromReq(req);
    data.type = 'text';
    data.text = req.incoming_message;
    logger.debug('getCreateTextPostPayloadFromReq', data);
    return data;
  },
  fetchFileStringFromPhotoUrl: function fetchFileStringFromPhotoUrl(url) {
    // @see https://github.com/visionmedia/superagent/issues/871#issuecomment-286199206
    return superagent.get(url)
      .buffer(true)
      .parse(superagent.parse.image)
      .then(res => res.body.toString('base64'));
  },
};
