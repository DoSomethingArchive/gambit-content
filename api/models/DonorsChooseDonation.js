/**
 * Models successful DonorsChoose donation transactions. 
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({

  created_at: {type: Date, default: Date.now},

  // Member profile information:
  mobile: {type: String, index: true},
  profile_email: String,
  profile_first_name: String,
  profile_postal_code: String,

  // Keep config info for record-keeping:
  mobilecommons_campaign_id: Number,
  donorschoose_bot_id: Number,

  // DonorsChoose information:
  donation_id: Number,
  donation_amount: Number,
  proposal_id: Number,
  proposal_url: String,
  proposal_remaining_amount: Number,
  school_name: String,
  school_city: String,
  school_state: String

})

module.exports = function(connection) {
  return connection.model('donorschoose_donation', schema);
};
