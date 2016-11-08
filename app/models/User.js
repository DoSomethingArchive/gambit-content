'use strict';

/**
 * Imports.
 */
const mongoose = require('mongoose');
const Promise = require('bluebird');

const helpers = rootRequire('lib/helpers');
const mobilecommons = rootRequire('lib/mobilecommons');
const logger = app.locals.logger;

/**
 * Schema.
 */
const userSchema = new mongoose.Schema({

  _id: { type: String, index: true },
  // TODO: Not sure we need this index
  mobile: { type: String, index: true },
  phoenix_id: Number,
  mobilecommons_id: Number,
  email: String,
  role: String,
  first_name: String,
  // Campaign the user is currently participating in via chatbot.
  current_campaign: Number,

});

/**
 * Parse given Northstar User for User model.
 */
function parseNorthstarUser(northstarUser) {
  const data = {
    _id: northstarUser.id,
    mobile: northstarUser.mobile,
    first_name: northstarUser.firstName,
    email: northstarUser.email,
    phoenix_id: northstarUser.drupalID,
    mobilecommons_id: northstarUser.mobilecommonsID,
    role: northstarUser.role,
  };

  return data;
}

/**
 * Query DS API for given User type/id and store.
 */
userSchema.statics.lookup = function (type, id) {
  const model = this;
  const statName = 'northstar: GET users';

  return new Promise((resolve, reject) => {
    logger.debug(`User.lookup(${type}, ${id})`);

    return app.locals.clients.northstar.Users
      .get(type, id)
      .then((northstarUser) => {
        app.locals.stathat(`${statName} 200`);
        logger.debug('northstar.Users.lookup success');
        const data = parseNorthstarUser(northstarUser);

        return model
          .findOneAndUpdate({ _id: data._id }, data, { upsert: true, new: true })
          .exec()
          .then(user => resolve(user))
          .catch(error => reject(error));
      })
      .catch((error) => {
        app.locals.stathatError(statName, error);

        return reject(error);
      });
  });
};

/**
 * Post user to DS API.
 */
userSchema.statics.post = function (data) {
  const model = this;
  const statName = 'northstar: POST users';

  const scope = data;
  scope.source = process.env.DS_API_USER_REGISTRATION_SOURCE || 'sms';
  scope.password = helpers.generatePassword(data.mobile);
  const emailDomain = process.env.DS_API_DEFAULT_USER_EMAIL || 'mobile.import';
  scope.email = `${data.mobile}@${emailDomain}`;

  return new Promise((resolve, reject) => {
    logger.debug('User.post');

    return app.locals.clients.northstar.Users
      .create(scope)
      .then((northstarUser) => {
        app.locals.stathat(`${statName} 200`);
        logger.info(`northstar.Users created user:${northstarUser.id}`);

        return model
          .findOneAndUpdate({ _id: northstarUser.id }, parseNorthstarUser(northstarUser), {
            upsert: true,
            new: true,
          })
          .exec()
          .then(user => resolve(user))
          .catch(error => reject(error));
      })
      .catch((error) => {
        app.locals.stathatError(statName, error);

        return reject(error);
      });
  });
};

/**
 * Updates MC Profile gambit_chatbot_response Custom Field with given msgTxt to deliver over SMS.
 * @param {number} oip - Opt-in Path ID of the Mobile Commons Opt-in Path that will send a message
 * @param {string} msgText - text message content to send to User
 */
userSchema.methods.postMobileCommonsProfileUpdate = function (oip, msgTxt) {
  const data = {
    // The MC Opt-in Path Conversation needs to render gambit_chatbot_response value as Liquid tag.
    // @see https://github.com/DoSomething/gambit/wiki/Chatbot#mobile-commons
    gambit_chatbot_response: msgTxt,
  };

  return mobilecommons.profile_update(this.mobilecommons_id, this.mobile, oip, data);
};

module.exports = function (connection) {
  return connection.model('users', userSchema);
};
