/**
 * Model for tracking the last tip delivered to a phone number.
 */

var mongoose = require('mongoose');

var Tip = function(modelName) {

  var uri = 'mongodb://localhost/ds-mdata-responder-last-tip-delivered';
  var db = mongoose.createConnection(uri);

  var schema = new mongoose.Schema({
    phone: String,
    last_tip_delivered: [{
      name: String,
      last_tip: Number
    }]
  });

  var model = db.model(modelName, schema);

  return model;
};

module.exports = Tip;
