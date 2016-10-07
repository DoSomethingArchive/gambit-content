'use strict';

/**
 * Models a DS Campaign.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({

  _id: { type: Number, index: true },
  title: String,
  type: String,
  status: String,
  keyword: String,
  rb_confirmed: String,
  rb_noun: String,
  rb_verb: String,
  tagline: String,

});

module.exports = function (connection) {
  return connection.model('campaigns', schema);
};
