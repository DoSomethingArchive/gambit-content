/**
 * @TODO comment
 */
var mongoose = require('mongoose');

var rbSchema = new mongoose.Schema({
  // Phone number of user submitting the report back
  phone: {type: String, index: true},

  // Campaign name identifier
  campaign: String,
  
  // URL of photo
  photo: String,
  
  // How many of thing was done
  quantity: String,
  
  // Why this campaign is important
  why_important: String,
  
  // Caption for the photo
  caption: String,

  // Timestamp
  started_at: {type: Date, default: Date.now}
});

module.exports = function(connection) {
  return connection.model('reportback', rbSchema);
}