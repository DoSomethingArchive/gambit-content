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
  email: String,
  role: String,
  first_name: String,
  // Hash table to store current signups: e.g. campaigns[campaignId] = signupId;
  campaigns: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Campaign the user is currently participating in via chatbot.
  current_campaign: Number,

});

/**
 * Parse given Mobile Commons request as a northstarUser to POST to DS API Users endpoint.
 */
function parseMobileCommonsProfileAsNorthstarUser(req) {
  const data = {
    mobile: req.body.phone,
    email: req.body.profile_email,
    first_name: req.body.profile_first_name,
    mobilecommons_id: req.body.profile_id,
    addr_zip: req.body.profile_postal_code,
  };

  return data;
}

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
    role: northstarUser.role,
  };

  return data;
}

/**
 * Query DS API for given User type/id and store.
 */
userSchema.statics.lookup = function (type, id) {
  const model = this;

  return new Promise((resolve, reject) => {
    logger.debug(`User.lookup type:${type} id:${id}`);

    return app.locals.clients.northstar.Users
      .get(type, id)
      .then((northstarUser) => {
        logger.debug('northstar.Users.lookup success');
        const data = parseNorthstarUser(northstarUser);

        return model
          .findOneAndUpdate({ _id: data._id }, data, { upsert: true, new: true })
          .exec()
          .then(user => resolve(user))
          .catch(error => reject(error));
      })
      .catch((error) => reject(error));
  });
};

/**
 * Post user to DS API.
 */
userSchema.statics.createForMobileCommonsRequest = function (req) {
  logger.debug(`User.createForMobileCommonsRequest profile_id:${req.body.profile_id}`);
  const model = this;

  const data = parseMobileCommonsProfileAsNorthstarUser(req);
  data.source = process.env.DS_API_POST_SOURCE;
  data.password = helpers.generatePassword(data.mobile);
  if (!data.email) {
    const defaultEmail = process.env.DS_API_DEFAULT_USER_EMAIL || 'mobile.import';
    data.email = `${data.mobile}@${defaultEmail}`;
  }

  return new Promise((resolve, reject) => {
    logger.debug('User.post');

    return app.locals.clients.northstar.Users
      .create(data)
      .then((northstarUser) => {
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
      .catch(error => reject(error));
  });
};

/**
 * Updates user's Mobile Commons Profile to send msgTxt as SMS via given Opt-in Path oip.
 */
userSchema.methods.postMobileCommonsProfileUpdate = function (req, oip, msgTxt) {
  const data = {
    // Target Opt oip needs to render gambit_chatbot_response Custom Field in Liquid to send msg.
    // @see https://github.com/DoSomething/gambit/wiki/Chatbot#mobile-commons
    gambit_chatbot_response: msgTxt,
  };

  if (!req.body.profile_northstar_id) {
    // Save it to avoid future Northstar GET users requests in subsequent incoming chatbot requests.
    data.northstar_id = this._id;
  }

  return mobilecommons.profile_update(this.mobile, oip, data);
};

/**
 * Set given signup on user's campaigns hash map, sets signup.campaign to user.current_campaign.
 */
userSchema.methods.setCurrentCampaign = function (signup) {
  const user = this;

  return new Promise((resolve, reject) => {
    logger.debug(`setCurrentSignup user:${user._id} campaigns[${signup.campaign}]:${signup.id}`);

    user.campaigns[signup.campaign] = signup.id;
    user.current_campaign = signup.campaign;
    return user.save()
      .then(updatedUser => resolve(updatedUser))
      .catch(error => reject(error));
  });
};

module.exports = function (connection) {
  return connection.model('users', userSchema);
};
