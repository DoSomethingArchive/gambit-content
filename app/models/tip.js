/**
 * Model for tracking the last tip delivered to a phone number.
 */

var mongoose = require('mongoose');

var tip = function(app, modelName) {

  var schema = new mongoose.Schema({
    phone: String,
    last_tip_delivered: [{
      name: String,
      last_tip: Number
    }]
  });

  return app.getModel(modelName, schema);
};

module.exports = tip;
