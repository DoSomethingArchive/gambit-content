'use strict';

/**
 * Imports.
 */
const mongoose = require('mongoose');

/**
 * Schema.
 */
const broadcastSchema = new mongoose.Schema({

  _id: { type: Number, index: true },
  type: { type: String, enum: ['signup', 'reminder'] },
  campaign: Number,

});

module.exports = function (connection) {
  return connection.model('broadcasts', broadcastSchema);
};
