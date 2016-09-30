'use strict';

/**
 * Models a upsert Reportback Submission posted to DS Reportback API.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({

  user: { type: String, index: true },
  campaign: { type: Number, index: true },
  created_at: { type: Date, default: Date.now() },
  caption: String,
  photo: String,
  quantity: Number,
  why_participated: String,
  submitted_at: Date,
  failed_at: Date,

});

module.exports = function (connection) {
  return connection.model('reportback_submissions', schema);
};
