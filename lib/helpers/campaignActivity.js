'use strict';

const superagent = require('superagent');
const logger = require('winston');
const requestHelper = require('./request');
const rogue = require('../rogue');
const util = require('./reportback');
const rogueClientConfig = require('../../config/lib/rogue/rogue-client');

module.exports = {
  createPhotoPostFromReq: function createPhotoPostFromReq(req) {
    const data = this.getCreatePhotoPostPayloadFromReq(req);
    logger.debug('createPhotoPostFromReq', { data });
    return this.fetchFileFromPhotoUrl(data.photoUrl)
      .then((file) => {
        delete data.photoUrl;
        data[rogueClientConfig.photoPostCreation.fileProperty] = file;
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
    data.text = draft.caption;
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
  fetchFileFromPhotoUrl: function fetchFileFromPhotoUrl(url) {
    return superagent.get(url)
      .buffer(true)
      // @see https://github.com/visionmedia/superagent/issues/871#issuecomment-286199206
      .parse(superagent.parse.image)
      .then((res) => {
        if (!rogueClientConfig.useV3()) {
          return res.body.toString('base64');
        }
        return res.body;
      });
  },
  getReportbackTextFromReq: function getReportbackTextFromReq(req) {
    const reportbackText = util.trimText(requestHelper.messageText(req));
    logger.verbose('getReportbackTextFromReq', { reportbackText });
    return reportbackText;
  },
  saveDraftCaptionFromReq: function saveDraftCaptionFromReq(req) {
    logger.verbose('saveDraftCaptionFromReq');
    req.draftSubmission.caption = this.getReportbackTextFromReq(req);
    return req.draftSubmission.save();
  },
  saveDraftWhyParticipatedFromReq: function saveDraftWhyParticipatedFromReq(req) {
    logger.verbose('saveDraftWhyParticipatedFromReq');
    req.draftSubmission.why_participated = this.getReportbackTextFromReq(req);
    return req.draftSubmission.save();
  },
};
