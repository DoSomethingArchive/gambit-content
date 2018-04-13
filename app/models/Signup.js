'use strict';

/**
 * Imports.
 */
const mongoose = require('mongoose');
const Promise = require('bluebird');
const underscore = require('underscore');
const camelCaseKeys = require('camelcase-keys-deep');
const logger = require('winston');

const ReportbackSubmission = require('./ReportbackSubmission');
const helpers = require('../../lib/helpers');
const rogue = require('../../lib/rogue');
const stathat = require('../../lib/stathat');

const upsertOptions = helpers.upsertOptions();

/**
 * Schema.
 */
const signupSchema = new mongoose.Schema({

  _id: {
    type: Number,
    index: true,
  },
  user: {
    type: String,
    index: true,
  },
  campaign: Number,
  keyword: String,
  draft_reportback_submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'reportback_submissions',
  },
  reportback: Number,
  // Last quantity submitted by the user.
  // We'll want to update this number from DS API once we're querying for
  // any existing or updates to Reportbacks for this Signup.
  total_quantity_submitted: Number,
  broadcast_id: Number,

});

/**
 * Parses a Rogue Activity response to return data for a Signup model.
 * @param {object} activityData - Rogue API response.data
 * @return {object}
 */
function parseActivityData(activityData) {
  const data = activityData[0];
  const result = {
    // TODO: remove when we switch to Rogue V3
    id: data.id || data.signup_id,
    user: data.northstar_id,
    campaign: data.campaign_id,
    total_quantity_submitted: data.quantity,
  };
  logger.verbose('parseActivityResponse', result);

  return result;
}

/**
 * Gets current Signup for given User / Campaign from DS API, stores if found. Returns false if not.
 * @param {string} userId
 * @param {number} campaignId.
 */
signupSchema.statics.lookupCurrentSignupForReq = function (req) {
  const model = this;
  const userId = req.userId;
  const campaignRunId = req.campaignRunId;

  return new Promise((resolve, reject) => {
    logger.debug(`Signup.lookupCurrent(${userId}, ${campaignRunId})`);

    return rogue.fetchActivityForUserIdAndCampaignRunId(userId, campaignRunId)
      .then((res) => {
        if (res.data.length < 1) {
          return resolve(false);
        }
        const signupData = parseActivityData(res.data);
        const signupId = signupData.id;
        logger.info('Signup.lookupCurrent', { signupId });

        return model.findOneAndUpdate({ _id: signupId }, signupData, upsertOptions)
          .populate('draft_reportback_submission')
          .exec();
      })
      .then(signupDoc => resolve(signupDoc))
      .catch((err) => {
        const scope = err;
        scope.message = `Signup.lookupCurrent error:${err.message}`;

        return reject(scope);
      });
  });
};

/**
 * Posts Signup to DS API and creates Signup model.
 * @param {object} req - Express request
 * @return {Promise}
 */
signupSchema.statics.createSignupForReq = function (req) {
  const model = this;
  const keyword = req.keyword;
  const userId = req.userId;
  const campaignId = req.campaignId;
  const broadcastId = req.broadcastId;
  logger.debug('Signup.createSignupForReq', { userId, campaignId, keyword });

  return new Promise((resolve, reject) => {
    helpers.campaignActivity.createSignupFromReq(req)
      .then((signup) => {
        const signupId = signup.data.signup_id;
        if (keyword) {
          stathat.postStat(`signup: ${keyword}`);
        }
        logger.info(`Signup.createSignupForReq created signup:${signupId}`);

        const data = {
          campaign: campaignId,
          user: userId,
        };
        if (keyword) {
          data.keyword = keyword;
        }
        if (broadcastId) {
          data.broadcast_id = broadcastId;
        }

        return model.findOneAndUpdate({ _id: signupId }, data, helpers.upsertOptions())
          .populate('draft_reportback_submission')
          .exec();
      })
      .then(signupDoc => resolve(signupDoc))
      .catch((err) => {
        const scope = err;
        scope.message = `Signup.createSignupForReq error:${err.message}`;

        return reject(scope);
      });
  });
};

/**
 * Creates a new Reportback Submission model and saves it to Signup's Draft Reportback Submission.
 */
signupSchema.methods.createDraftReportbackSubmission = function () {
  const signup = this;

  return new Promise((resolve, reject) => {
    const logPrefix = 'Signup.createDraftReportbackSubmission';
    logger.debug(logPrefix);

    return ReportbackSubmission
      .create({
        campaign: signup.campaign,
        user: signup.user,
      })
      .then((reportbackSubmission) => {
        const submissionId = reportbackSubmission._id;
        logger.verbose(`${logPrefix} created reportback_submission:${submissionId.toString()}`);
        signup.draft_reportback_submission = submissionId;

        return signup.save();
      })
      .then((updatedSignup) => {
        logger.verbose(`${logPrefix} updated signup:${signup._id}`);
        stathat.postStat('created draft_reportback_submission');

        return resolve(updatedSignup);
      })
      .catch((err) => {
        const scope = err;
        scope.message = `Signup.createDraftReportbackSubmission error:${err.message}`;

        return reject(scope);
      });
  });
};

/**
 * Posts Signup Draft Reportback Submission to DS API and updates Submission and Signup accordingly.
 */
signupSchema.methods.createPostForReq = function (req) {
  const signup = this;
  const submission = signup.draft_reportback_submission;
  logger.debug(`Signup.createPostForReq signup:${this._id}`);
  const dateSubmitted = Date.now();

  return new Promise((resolve, reject) => {
    helpers.campaignActivity.createPhotoPostFromReq(req)
      .then((res) => {
        const reportbackId = res.data.id;
        signup.reportback = reportbackId;
        signup.total_quantity_submitted = Number(submission.quantity);
        signup.draft_reportback_submission = undefined;

        return signup.save();
      })
      .then(() => {
        logger.verbose(`updated signup:${signup._id}`);
        submission.submitted_at = dateSubmitted;

        return submission.save();
      })
      .then(() => {
        logger.verbose(`updated reportback_submission:${submission._id.toString()}`);

        return resolve(signup);
      })
      .catch((err) => {
        submission.failed_at = dateSubmitted;
        submission.save();

        const scope = err;
        scope.message = `Signup.createPostForReq error:${err.message}`;

        return reject(scope);
      });
  });
};

/**
 * Returns formatted object to use in API responses.
 */
signupSchema.methods.formatForApi = function () {
  const draft = this.draft_reportback_submission;
  let draftId;
  if (draft && draft._id) {
    draftId = draft._id.toString();
  }

  const signupObject = this.toObject();
  const omitKeys = ['__v'];
  const formattedSignup = camelCaseKeys(underscore.omit(signupObject, omitKeys));
  formattedSignup.id = Number(formattedSignup.id);

  if (draft) {
    const draftObject = formattedSignup.draftReportbackSubmission;
    // We don't need to repeat the Campaign property inside our draft Reportback Submission, it's
    // defined on the Signup.
    omitKeys.push('campaign');
    formattedSignup.draftReportbackSubmission = underscore.omit(draftObject, omitKeys);
    // A Mongo ObjectId gets converted to an id object, we just want an ID string.
    formattedSignup.draftReportbackSubmission.id = draftId;
  }

  // Return ID properties as objects instead.
  formattedSignup.campaign = { id: formattedSignup.campaign };
  formattedSignup.user = { id: formattedSignup.user };
  if (formattedSignup.reportback) {
    formattedSignup.reportback = { id: formattedSignup.reportback };
  }

  return formattedSignup;
};

module.exports = mongoose.model('signups', signupSchema);
