/**
 * Model for tracking user data needed for submitting a donation.
 */

var mongoose = require('mongoose')
  ;

function DonationInfo(app) {
  var modelName = 'donation_info';

  var schema  = new mongoose.Schema();
  schema.add({
    // User's mobile number
    mobile: String,

    // User's email
    email: String,

    // User's first name
    first_name: String,

    // User's state or zipcode - depends on campaign
    location: String,

    // Project ID
    project_id: Number,

    // Project URL
    project_url: String
  });

  return app.getModel(modelName, schema);
}

module.exports = DonationInfo;
