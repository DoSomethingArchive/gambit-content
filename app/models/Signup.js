'use strict';

/**
 * Imports.
 */
const mongoose = require('mongoose');
const Promise = require('bluebird');
const NotFoundError = require('../exceptions/NotFoundError');
const logger = app.locals.logger;

/**
 * Schema.
 */
const signupSchema = new mongoose.Schema({

  _id: { type: Number, index: true },
  user: { type: String, index: true },
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
  // Corresponds to the submitted_at of User's most recent ReportbackSubmission.
  // Set this value as last import date if we start querying for updates.
  updated_at: Date,

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

  return new Promise((resolve, reject) => {
    logger.debug(`Signup.lookupById:${id}`);

    return app.locals.clients.northstar
      .Signups.get(id)
      .then((northstarSignup) => {
        logger.debug(`northstar.Signups.get:${id} success`);
        const data = parseNorthstarSignup(northstarSignup);

        return model.findOneAndUpdate({ _id: id }, data, { upsert: true, new: true })
          .exec()
          .then(signup => resolve(signup))
          .catch(error => reject(error));
      })
      .catch(err => {
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

  return new Promise((resolve, reject) => {
    logger.debug(`Signup.lookupCurrentForUserAndCampaign:${user._id}, ${campaign._id}`);

    return app.locals.clients.northstar
      .Signups.index({ user: user._id, campaigns: campaign._id })
      .then((northstarSignups) => {
        if (northstarSignups.length < 1) {
          return resolve(false);
        }

        const currentSignup = northstarSignups.find(signup => signup.campaignRun.current);
        if (!currentSignup) {
          return resolve(false);
        }

        const data = parseNorthstarSignup(currentSignup);

        return model.findOneAndUpdate({ _id: data._id }, data, { upsert: true, new: true })
          .populate('draft_reportback_submission')
          .exec()
          .then(signup => resolve(signup))
          .catch(error => reject(error));
      })
      .catch(err => reject(err));
  });
};

signupSchema.statics.post = function (user, campaign, keyword) {
  const model = this;

  return new Promise((resolve, reject) => {
    logger.debug(`Signup.post (${user._id}, ${campaign._id}, ${keyword}`);

    return app.locals.clients.phoenix.Campaigns
      .signup(campaign._id, {
        source: process.env.DS_API_POST_SOURCE,
        uid: user.phoenix_id,
      })
      .then((signupID) => {
        logger.debug(`Signup.post created signup:${signupID}`);
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
      .catch(err => reject(err));
  });
};

module.exports = function (connection) {
  return connection.model('signups', signupSchema);
};
