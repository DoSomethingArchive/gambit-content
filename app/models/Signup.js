'use strict';

/**
 * Imports.
 */
const mongoose = require('mongoose');
const Promise = require('bluebird');
const NotFoundError = require('../exceptions/NotFoundError');
const logger = app.locals.logger;

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
  campaign: {
    type: Number,
    ref: 'campaigns',
  },
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

});

function parseNorthstarSignup(northstarSignup) {
  const data = {
    _id: Number(northstarSignup.id),
    user: northstarSignup.user,
    campaign: Number(northstarSignup.campaign),
  };
  // Only set if this was called from postSignup(req).
  if (northstarSignup.keyword) {
    data.keyword = northstarSignup.keyword;
  }
  if (northstarSignup.reportback) {
    data.reportback = Number(northstarSignup.reportback.id);
    data.total_quantity_submitted = northstarSignup.reportback.quantity;
  }

  return data;
}

/**
 * Get given Signup ID from DS API then store.
 * @param {number} id - DS Signup id.
 */
signupSchema.statics.lookupById = function (id) {
  const model = this;
  const statName = 'northstar: GET signups/{id}';

  return new Promise((resolve, reject) => {
    logger.debug(`Signup.lookupById:${id}`);

    return app.locals.clients.northstar
      .Signups.get(id)
      .then((northstarSignup) => {
        app.locals.stathat(`${statName} 200`);
        logger.debug(`northstar.Signups.get:${id} success`);
        const data = parseNorthstarSignup(northstarSignup);

        return model.findOneAndUpdate({ _id: id }, data, { upsert: true, new: true })
          .exec()
          .then(signup => resolve(signup))
          .catch(error => reject(error));
      })
      .catch(err => {
        app.locals.stathatError(statName, err);
        if (err.status === 404) {
          const msg = `Signup ${id} not found.`;
          const notFoundError = new NotFoundError(msg);
          return reject(notFoundError);
        }

        return reject(err);
      });
  });
};

/**
 * Gets current Signup for given User / Campaign from DS API, stores if found. Returns false if not.
 * @param {User} user - User model.
 * @param {Campaign} campaign - Campaign model.
 */
signupSchema.statics.lookupCurrent = function (user, campaign) {
  const model = this;
  const statName = 'northstar: GET signups';

  return new Promise((resolve, reject) => {
    logger.debug(`Signup.lookupCurrent(${user._id}, ${campaign._id})`);

    return app.locals.clients.northstar
      .Signups.index({ user: user._id, campaigns: campaign._id })
      .then((northstarSignups) => {
        app.locals.stathat(`${statName} 200`);

        if (northstarSignups.length < 1) {
          return resolve(false);
        }

        const currentSignup = northstarSignups.find(signup => signup.campaignRun.current);
        if (!currentSignup) {
          return resolve(false);
        }

        const data = parseNorthstarSignup(currentSignup);

        return model.findOneAndUpdate({ _id: data._id }, data, { upsert: true, new: true })
          .populate('user')
          .populate('draft_reportback_submission')
          .exec()
          .then(signup => resolve(signup))
          .catch(error => reject(error));
      })
      .catch((err) => {
        app.locals.stathatError(statName, err);

        return reject(err);
      });
  });
};

/**
 * Posts Signup to DS API.
 * @param {User} user - User model.
 * @param {Campaign} campaign - Campaign model.
 * @param {string} keyword - Keyword used to trigger Campaign Signup.
 */
signupSchema.statics.post = function (user, campaign, keyword) {
  const model = this;
  const statName = 'phoenix: POST signups';

  return new Promise((resolve, reject) => {
    logger.debug(`Signup.post(${user._id}, ${campaign._id}, ${keyword})`);

    return app.locals.clients.phoenix.Campaigns
      .signup(campaign._id, {
        source: postSource,
        uid: user.phoenix_id,
      })
      .then((signupID) => {
        app.locals.stathat(`${statName} 200`);
        app.locals.stathat(`signup: ${keyword}`);
        logger.info(`Signup.post created signup:${signupID}`);

        const data = {
          campaign: campaign._id,
          user: user._id,
          keyword,
        };

        return model.findOneAndUpdate({ _id: signupID }, data, { upsert: true, new: true })
          .exec()
          .then(signup => resolve(signup))
          .catch(error => reject(error));
      })
      .catch((err) => {
        app.locals.stathatError(statName, err);

        return reject(err);
      });
  });
};

/**
 * Creates a new Reportback Submission model and saves it to Signup's Draft Reportback Submission.
 */
signupSchema.methods.createDraftReportbackSubmission = function () {
  const signup = this;

  return new Promise((resolve, reject) => {
    logger.debug('Signup.createDraftReportbackSubmission');

    return app.locals.db.reportback_submissions
      .create({
        campaign: signup.campaign,
        user: signup.user,
      })
      .then(reportbackSubmission => {
        const submissionId = reportbackSubmission._id;
        logger.debug(`Signup.createDraftReportbackSubmission created:${submissionId.toString()}`);
        signup.draft_reportback_submission = submissionId;

        return signup.save();
      })
      .then((updatedSignup) => {
        app.locals.stathat('created draft_reportback_submission');

        return resolve(updatedSignup);
      })
      .catch(err => reject(err));
  });
};

/**
 * Posts Signup Draft Reportback Submission to DS API and updates Submission and Signup accordingly.
 */
signupSchema.methods.postDraftReportbackSubmission = function () {
  const signup = this;
  const dateSubmitted = Date.now();
  const statName = 'phoenix: POST reportbacks';

  return new Promise((resolve, reject) => {
    logger.debug('Signup.postDraftReportbackSubmission');

    const submission = signup.draft_reportback_submission;
    const data = {
      source: postSource,
      uid: signup.user.phoenix_id,
      quantity: submission.quantity,
      caption: submission.caption,
      file_url: submission.photo,
    };
    if (submission.why_participated) {
      data.why_participated = submission.why_participated;
    }

    return app.locals.clients.phoenix.Campaigns
      .reportback(signup.campaign, data)
      .then((reportbackId) => {
        app.locals.stathat(`${statName} 200`);
        logger.info(`phoenix.Campaigns.reportback:${reportbackId}`);

        signup.reportback = reportbackId;
        signup.total_quantity_submitted = Number(submission.quantity);
        signup.draft_reportback_submission = undefined;

        return signup.save();
      })
      .then(() => {
        logger.debug(`updated signup:${signup._id}`);
        submission.submitted_at = dateSubmitted;

        return submission.save();
      })
      .then(() => {
        logger.debug(`updated reportback_submission:${submission._id.toString()}`);

        return resolve(signup);
      })
      .catch((err) => {
        app.locals.stathatError(statName, err);
        logger.error(err.message);

        submission.failed_at = dateSubmitted;
        submission.save();

        return reject(err);
      });
  });
};

module.exports = function (connection) {
  return connection.model('signups', signupSchema);
};
