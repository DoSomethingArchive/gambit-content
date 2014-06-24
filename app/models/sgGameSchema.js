/**
 * Base schema for SMS games.
 */

var mongoose = require('mongoose')
    ;

var sgGameSchema = function() {
  var schema = new mongoose.Schema();
  schema.add({
    // Name of the alpha user
    alpha_name: String,

    // Phone number of the alpha user
    alpha_phone: String,

    betas: [{
      // Whether or not the user has accepted the invite
      invite_accepted: Boolean,

      // Name of the beta user
      name: String,

      // Phone number of the beta user
      phone: String
    }]
  });

  return schema;
};

module.exports = sgGameSchema;
