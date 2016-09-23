/**
 * Models a DS Signup.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({

  _id: {type: Number, index: true},

  user: {type: String, index: true},

  campaign: {type: Number, index: true},

  created_at: {type: Date, default: Date.now},

  reportback: Number,

  // If user is in the middle of a Reportback Submission, we store its ID 
  // for easy lookup.
  draft_reportback_submission: String,

  // Last quantity submitted by the user.
  // We'll want to update this number from DS API once we're querying for
  // any existing or updates to Reportbacks for this Signup.
  total_quantity_submitted: Number,

  // Corresponds to the submitted_at of User's most recent ReportbackSubmission.
  // Set this value as last import date if we start querying for updates.
  updated_at: Date

})

module.exports = function(connection) {
  return connection.model('signups', schema);
};
