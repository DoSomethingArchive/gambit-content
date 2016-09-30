'use strict';

/**
 * Models a DS Campaign.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({

  _id: { type: Number, index: true },
  title: String,
  rb_noun: String,
  rb_verb: String,

  // TODO: Remove -- we'll use one Mobile Commons Campaign to run all DS Campaigns
  current_mobilecommons_campaign: Number,
  staging_mobilecommons_campaign: Number,

});

module.exports = function (connection) {
  return connection.model('campaigns', schema);
};
