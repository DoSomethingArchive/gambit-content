/**
 * Config model used for persistently tracking a user's setup
 * of a multiplayer SMS game through mobile.
 */

var mongoose = require('mongoose')
  ;

var sgGameCreateConfig = function(app) {
  var modelName = 'sg_gamecreateconfig';

  var schema = new mongoose.Schema();
  schema.add({
    // Mobile number of the alpha user
    alpha_mobile: String,

    // Name of the alpha user
    alpha_first_name: String,

    // Mobile number of beta 1
    beta_mobile_0: String,

    // Mobile number of beta 2
    beta_mobile_1: String,

    // Mobile number of beta 3
    beta_mobile_2: String,

    // Story ID
    story_id: Number,

    // Game type
    story_type: String
  });

  return app.getModel(modelName, schema);
}

module.exports = sgGameCreateConfig;
