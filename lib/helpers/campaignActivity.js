'use strict';

const superagent = require('superagent');
const logger = require('winston');
const requestHelper = require('./request');
const rogue = require('../rogue');
const util = require('./reportback');
const rogueClientConfig = require('../../config/lib/rogue/rogue-client');

/**
 * @param {Object} req
 * @return {Promise}
 */
function createDraftFromReq(req) {
  return req.signup.createDraftReportbackSubmission();
}

module.exports = {
  createDraftFromReq,
  // TODO: Define these functions outside of module.exports for consistency among files.
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
  getCreateTextPostPayloadFromReq: function getCreateTextPostPayloadFromReq(req) {
    const data = this.getDefaultCreatePayloadFromReq(req);
    data.type = 'text';
    data.text = this.getReportbackTextFromReq(req);
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
  /**
   * @param {Object} req
   * @return {String}
   */
  getReportbackTextFromReq: function getReportbackTextFromReq(req) {
    // We trim the user message text for edge-case when it's too long, Twilio splits out the message
    // into two different requests to our inbound URL.
    // TODO: Verify this is still needed and not just in place for legacy reasons.
    const reportbackText = util.trimText(requestHelper.getMessageText(req));
    logger.verbose('getReportbackTextFromReq', { reportbackText });
    return reportbackText;
  },
  /**
   * @param {Object} req
   * @return {Promise}
   */
  saveDraftCaptionFromReq: function saveDraftCaptionFromReq(req) {
    logger.verbose('saveDraftCaptionFromReq');
    req.draftSubmission.caption = this.getReportbackTextFromReq(req);
    return req.draftSubmission.save();
  },
  /**
   * @param {Object} req
   * @return {Promise}
   */
  saveDraftPhotoFromReq: function saveDraftPhotoUrlFromReq(req) {
    logger.verbose('saveDraftPhotoUrlFromReq');
    req.draftSubmission.photo = requestHelper.getMessagePhotoUrl(req);
    return req.draftSubmission.save();
  },
  /**
   * @param {Object} req
   * @return {Promise}
   */
  saveDraftWhyParticipatedFromReq: function saveDraftWhyParticipatedFromReq(req) {
    logger.verbose('saveDraftWhyParticipatedFromReq');
    req.draftSubmission.why_participated = this.getReportbackTextFromReq(req);
    return req.draftSubmission.save();
  },
};
