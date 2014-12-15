/**
 * Model for tracking the last tip delivered to a phone number.
 */
var mongoose = require('mongoose');

var tipSchema = new mongoose.Schema({
  phone: {type: String, index: true},
  last_tip_delivered: [{
    name: String,
    last_tip: Number
  }]
})

// module.exports = mongoose.model('tip', tipSchema);

module.exports = function(connection) {
  return connection.model('tip', tipSchema);
}