'use strict';

/**
 * Imports.
 */
const mongoose = require('mongoose');
const Promise = require('bluebird');
const emojiStrip = require('emoji-strip');
const logger = require('winston');

const ReportbackSubmission = require('./ReportbackSubmission');
const helpers = require('../../lib/helpers');
const phoenix = require('../../lib/phoenix');
const stathat = require('../../lib/stathat');

const postSource = process.env.DS_API_POST_SOURCE || 'sms-mobilecommons';

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
    ref: 'users',
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

function parsePhoenixSignup(phoenixSignup) {
  const data = {
    _id: Number(phoenixSignup.id),
    user: phoenixSignup.user,
    campaign: Number(phoenixSignup.campaign),
  };
  // Only set if this was called from postSignup(req).
  if (phoenixSignup.keyword) {
    data.keyword = phoenixSignup.keyword;
  }
  if (phoenixSignup.reportback) {
    data.reportback = Number(phoenixSignup.reportback.id);
    data.total_quantity_submitted = phoenixSignup.reportback.quantity;
  }

  return data;
}

/**
 * Get given Signup ID from DS API then store.
 * @param {number} id - DS Signup id.
 */
signupSchema.statics.lookupById = function (id) {
  const model = this;
  const statName = 'phoenix: GET signups/{id}';

  return new Promise((resolve, reject) => {
    logger.debug(`Signup.lookupById:${id}`);

    return phoenix.client.Signups.get(id)
      .then((phoenixSignup) => {
        stathat.postStat(`${statName} 200`);
        logger.debug(`phoenix.Signups.get:${id} success`);
        const data = parsePhoenixSignup(phoenixSignup);

        return model.findOneAndUpdate({ _id: id }, data, helpers.upsertOptions()).exec();
      })
      .then(signupDoc => resolve(signupDoc))
      .catch((err) => {
        stathat.postStatWithError(statName, err);
        const scope = err;
        scope.message = `Signup.lookupById error:${err.message}`;
        return reject(scope);
      });
  });
};

/**
 * Gets current Signup for given User / Campaign from DS API, stores if found. Returns false if not.
 * @param {User} user - User model.
 * @param {Campaign} campaign - Phoenix Campaign object.
 */
signupSchema.statics.lookupCurrent = function (user, campaign) {
  const model = this;
  const statName = 'phoenix: GET signups';

  return new Promise((resolve, reject) => {
    logger.debug(`Signup.lookupCurrent(${user._id}, ${campaign.id})`);

    return phoenix.client.Signups.index({ user: user._id, campaigns: campaign.id })
      .then((phoenixSignups) => {
        stathat.postStat(`${statName} 200`);

        if (phoenixSignups.length < 1) {
          return resolve(false);
        }

        const currentSignup = phoenixSignups.find(signup => signup.campaignRun.current);
        if (!currentSignup) {
          return resolve(false);
        }

        const data = parsePhoenixSignup(currentSignup);
        logger.verbose(`Signup.lookCurrent found signup:${data._id}`);

        return model.findOneAndUpdate({ _id: data._id }, data, helpers.upsertOptions())
          .populate('user')
          .populate('draft_reportback_submission')
          .exec();
      })
      .then(signupDoc => resolve(signupDoc))
      .catch((err) => {
        stathat.postStatWithError(statName, err);
        const scope = err;
        scope.message = `Signup.lookupCurrent error:${err.message}`;

        return reject(scope);
      });
  });
};

/**
 * Posts Signup to DS API.
 * @param {User} user - User model.
 * @param {Campaign} campaign - Phoenix Campaign object.
 * @param {string} keyword - Keyword used to trigger Campaign Signup.
 * @param {number} broadcastId
 * @return {Promise}
 */
signupSchema.statics.post = function (user, campaign, keyword, broadcastId) {
  const model = this;
  const statName = 'phoenix: POST signups';

  return new Promise((resolve, reject) => {
    logger.debug(`Signup.post(${user._id}, ${campaign.id}, ${keyword})`);
    const postData = {
      source: postSource,
      northstar_id: user._id,
    };

    return phoenix.client.Campaigns.signup(campaign.id, postData)
      .then((signupId) => {
        stathat.postStat(`${statName} 200`);
        if (keyword) {
          stathat.postStat(`signup: ${keyword}`);
        }
        logger.info(`Signup.post created signup:${signupId}`);

        const data = {
          campaign: campaign.id,
          user: user._id,
        };
        if (keyword) {
          data.keyword = keyword;
        }
        if (broadcastId) {
          data.broadcast_id = broadcastId;
        }

        return model.findOneAndUpdate({ _id: signupId }, data, helpers.upsertOptions())
          .populate('user')
          .populate('draft_reportback_submission')
          .exec();
      })
      .then(signupDoc => resolve(signupDoc))
      .catch((err) => {
        stathat.postStatWithError(statName, err);
        const scope = err;
        scope.message = `Signup.post error:${err.message}`;

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
signupSchema.methods.postDraftReportbackSubmission = function () {
  const signup = this;
  logger.debug(`Signup.postDraftReportbackSubmission signup:${JSON.stringify(signup)}`);

  const dateSubmitted = Date.now();
  const statName = 'phoenix: POST reportbacks';

  return new Promise((resolve, reject) => {
    const submission = signup.draft_reportback_submission;
    const data = {
      source: postSource,
      northstar_id: signup.user._id,
      quantity: submission.quantity,
      // Although we strip emoji in our chatbot router in pull#910, some submissions may have emoji
      // saved before we deployed Gambit version 4.3.0.
      // We can eventually move this once we clear out all stuck Reportback Submissions, as it's
      // already been done for new submissions created after deployment of 4.3.0.
      caption: emojiStrip(submission.caption),
      file_url: submission.photo,
    };
    if (submission.why_participated) {
      data.why_participated = emojiStrip(submission.why_participated);
    }
    logger.debug(`Signup.postDraftReportbackSubmission data:${JSON.stringify(data)}`);

    return phoenix.client.Campaigns.reportback(signup.campaign, data)
      .then((reportbackId) => {
        stathat.postStat(`${statName} 200`);
        logger.info(`phoenix.client.Campaigns.reportback:${reportbackId}`);

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
        scope.message = `Signup.postDraftReportbackSubmission error:${err.message}`;

        return reject(scope);
      });
  });
};

module.exports = mongoose.model('signups', signupSchema);
