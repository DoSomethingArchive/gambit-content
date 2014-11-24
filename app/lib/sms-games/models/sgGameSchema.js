/**
 * Base schema for SMS games.
 */
var mongoose = require('mongoose');

var sgGameSchema = new mongoose.Schema({
  // ID of the story to play through
  story_id: Number,

  // Name of the alpha user
  alpha_name: String,

  // Phone number of the alpha user
  alpha_phone: String,

  betas: [{
    // Whether or not the user has accepted the invite
    invite_accepted: Boolean,

    // Name of the beta user
    name: String,

    // Phone number of the beta user
    phone: String
  }]
})

// Note that we're exporting the SCHEMA, not the MODEL itself.
module.exports = sgGameSchema;