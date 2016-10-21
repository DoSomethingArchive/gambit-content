'use strict';

/**
 * Imports.
 */
const mongoose = require('mongoose');
const Promise = require('bluebird');

const logger = app.locals.logger;
/**
 * Schema.
 */
const signupSchema = new mongoose.Schema({

  _id: { type: Number, index: true },
  user: { type: String, index: true },
  campaign: { type: Number, index: true },
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

module.exports = function (connection) {
  return connection.model('signups', signupSchema);
};

/**
 * Statics.
 */

/**
 * Query DS API for given Signup id and store.
 */
signupSchema.statics.getById = Promise.method((id) => {
  app.locals.logger.debug(`Signup.getById:${id}`);

  return app.locals.clients.northstar.Signups.get(id)
    .then(northstarSignup => {
      logger.debug(`northstar.Signups.get:${id} success`);

      return signupSchema.statics.store(northstarSignup);
    });
});

/**
 * Parse given Northstar Signup and return Signup model.
 */
signupSchema.statics.store = Promise.method((northstarSignup) => {
  logger.debug(`Signup.store id:${northstarSignup.id}`);

  const data = {
    _id: Number(northstarSignup.id),
    user: northstarSignup.user,
    campaign: northstarSignup.campaign,
  };
  // Only set if this was called from postSignup(req).
  if (northstarSignup.keyword) {
    data.keyword = northstarSignup.keyword;
  }
  if (northstarSignup.reportback) {
    data.reportback = Number(northstarSignup.reportback.id);
    data.total_quantity_submitted = northstarSignup.reportback.quantity;
  }

  // Something's off here -- should be able to use this instead of app.locals.db.signups
  return app.locals.db.signups
    .findOneAndUpdate({ _id: northstarSignup.id }, data, { upsert: true, new: true })
    .exec();
});
