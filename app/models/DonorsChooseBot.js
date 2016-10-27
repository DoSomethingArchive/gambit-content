'use strict';

/**
 * Models a Gambit Jr. DonorsChooseBot.
 */
const mongoose = require('mongoose');
const Promise = require('bluebird');
const gambitJunior = rootRequire('lib/junior');
const logger = app.locals.logger;

const donorsChooseBotSchema = new mongoose.Schema({

  _id: { type: Number, index: true },
  msg_ask_email: String,
  msg_ask_first_name: String,
  msg_ask_zip: String,
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

module.exports = function (connection) {
  return connection.model('donorschoosebots', donorsChooseBotSchema);
};
