'use strict';

/**
 * Models a Gambit Jr. DonorsChooseBot.
 */
const mongoose = require('mongoose');
const Promise = require('bluebird');
const gambitJunior = rootRequire('lib/junior');
const logger = app.locals.logger;
const stathat = app.locals.stathat;

const donorsChooseBotSchema = new mongoose.Schema({

  _id: { type: Number, index: true },
  msg_ask_email: String,
  msg_ask_first_name: String,
  msg_ask_zip: String,
  msg_donation_confirmation: String,
  msg_donation_success: String,
  msg_error_generic: String,
  msg_invalid_email: String,
  msg_invalid_first_name: String,
  msg_invalid_zip: String,
  msg_project_link: String,
  msg_max_donations_reached: String,
  msg_search_start: String,
  msg_search_no_results: String,

});

/**
 * Query Gambit Jr API for given DonorsChooseBot and store.
 */
donorsChooseBotSchema.statics.lookupByID = function (id) {
  const model = this;

  return new Promise((resolve, reject) => {
    logger.debug(`donorsChooseBotSchema.lookupByID:${id}`);

    return gambitJunior
      .get('donorschoosebots', id)
      .then(response => {
        const data = response;
        data._id = Number(response.id);
        data.id = undefined;

        return model
          .findOneAndUpdate({ _id: data._id }, data, { upsert: true, new: true })
          .exec()
          .then(donorsChooseBot => resolve(donorsChooseBot))
          .catch(error => reject(error));
      })
      .catch(error => reject(error));
  });
};

/**
 * Returns rendered DonorsChooseBot message for given Express req and given DonorsChooseBot msgType.
 */
donorsChooseBotSchema.methods.renderMessage = function (req, msgType) {
  const logMsg = `donorschoosebot: ${msgType}`;
  logger.info(logMsg);
  stathat(logMsg);

  const property = `msg_${msgType}`;
  let msg = this[property];

  if (req.body.profile_postal_code) {
    msg = msg.replace('{{postal_code}}', req.body.profile_postal_code);
  }
  if (req.donation) {
    msg = msg.replace('{{description}}', req.donation.proposal_description);
    msg = msg.replace('{{school_name}}', req.donation.school_name);
    msg = msg.replace('{{teacher_name}}', req.donation.teacher_name);
    msg = msg.replace('{{url}}', req.donation.proposal_url);
  }

  return msg;
};

module.exports = function (connection) {
  return connection.model('donorschoosebots', donorsChooseBotSchema);
};
