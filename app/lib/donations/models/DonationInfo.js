/**
 * Model for tracking user data needed for submitting a donation.
 */
var mongoose = require('mongoose');

var donationInfoSchema = new mongoose.Schema({
  // User's mobile number
  mobile: {type: String, index: true},

  // User's email
  email: String,

  // User's first name
  first_name: String,

  // User's state or zipcode - depends on campaign
  location: String,

  // Timestamp. 
  created_at: {type: Date, default: Date.now},

  // Project ID
  project_id: Number,

  // Project URL
  project_url: String, 

  // Flag for donation completed. Flipped to 'true' when 
  // retrieveEmail() is called, which itself calls submitDonation(). 
  // Note that the flag is flipped *before* the donation is successfully 
  // processed; this is safe because we will redirect the user to restart
  // the donation flow if anything goes wrong. 
  donation_complete: false,  
})

module.exports = mongoose.model('donation_info', donationInfoSchema);