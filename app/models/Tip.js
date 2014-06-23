/**
 * Model for tracking the last tip delivered to a phone number.
 */

var mongoose = require('mongoose');

var Tip = function(app, modelName) {

  var db = mongoose.createConnection(app.get('database-uri'));

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
