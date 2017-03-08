'use strict';

/**
 * Models a successful DonorsChoose donation transaction.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({

  created_at: { type: Date, default: Date.now },

  // Member profile our donation is on behalf of.
  mobile: { type: String, index: true },
  profile_email: String,
  profile_first_name: String,
  profile_postal_code: String,

  // DonorsChoose donation details:
  donation_id: Number,
  donation_amount: Number,
  proposal_id: Number,
  proposal_url: String,
  proposal_remaining_amount: Number,
  school_name: String,
  school_city: String,
  school_state: String,
  teacher_name: String,
  proposal_description: String,

});

module.exports = mongoose.model('donorschoose_donation', schema);
