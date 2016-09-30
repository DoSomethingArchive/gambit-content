'use strict';

/**
 * Models a DS User.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({

  _id: { type: String, index: true },
  // TODO: Not sure we need this index
  mobile: { type: String, index: true },
  phoenix_id: Number,
  email: String,
  role: String,
  first_name: String,
  // Hash table to store current signups: e.g. campaigns[campaignId] = signupId;
  campaigns: { type: mongoose.Schema.Types.Mixed, default: {} },

});

module.exports = function (connection) {
  return connection.model('users', schema);
};
