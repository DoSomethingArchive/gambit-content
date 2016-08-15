/**
 * Models successful DonorsChoose donation transactions. 
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({

  created_at: {type: Date, default: Date.now},

  // Member profile information:
  mobile: {type: String, index: true},
  email: String,
  first_name: String,
  postal_code: String,

  // Donation transaction information:
  donation_id: Number,
  proposal_id: Number,
  donation_amount: Number,
  remaining_amount: Number,
  school_name: String,
  school_city: String,
  school_state: String,
  url: String

})

module.exports = function(connection) {
  return connection.model('donorschoose_donation', schema);
};
