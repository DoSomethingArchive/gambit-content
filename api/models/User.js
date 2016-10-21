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
const userSchema = new mongoose.Schema({

  _id: { type: String, index: true },
  // TODO: Not sure we need this index
  mobile: { type: String, index: true },
  phoenix_id: Number,
  email: String,
  role: String,
  first_name: String,
  // Hash table to store current signups: e.g. campaigns[campaignId] = signupId;
  campaigns: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Campaign the user is currently participating in via chatbot.
  current_campaign: Number,

});

module.exports = function (connection) {
  return connection.model('users', userSchema);
};

/**
 * Statics.
 */

/**
 * Query DS API for given User type/id and store.
 */
userSchema.statics.get = Promise.method((type, id) => {
  logger.debug(`User.get type:${type} id:${id}`);

  return app.locals.clients.northstar.Users
    .get(type, id)
    .then((northstarUser) => {
      logger.debug('northstar.Users.get success');

      return userSchema.statics.store(northstarUser);
    })
    .catch(() => {
      logger.debug(`could not getUser type:${type} id:${id}`);

      return null;
    });
});

/**
 * Parse given Northstar User and return User model.
 */
userSchema.statics.store = Promise.method((northstarUser) => {
  logger.debug(`User.store id:${northstarUser.id}`);

  const data = {
    _id: northstarUser.id,
    mobile: northstarUser.mobile,
    first_name: northstarUser.firstName,
    email: northstarUser.email,
    phoenix_id: northstarUser.drupalID,
    role: northstarUser.role,
    campaigns: {},
  };

  return app.locals.db.users
    .findOneAndUpdate({ _id: data._id }, data, {
      upsert: true,
      new: true,
    });
});
