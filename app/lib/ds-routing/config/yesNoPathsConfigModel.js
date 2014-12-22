/**
 * Model for the yes-no-paths SMS configuration document. This configures any 
 * juncture in a campaign flow where the user is asked to respond yes or no, with 
 * either answer bringing about a separate conversation flow with a unique OIP. The most 
 * common use case of this yes-no-path is when the user is asked if their phone can send photos 
 * (has MMS abilities), and she texts back "yes" or "no." Each object corresponds to one 
 * `campaign's yes-no-path configuration. 
 */
var mongoose = require('mongoose');

var yesNoPathsConfigSchema = new mongoose.Schema({

  // Reassigning the _id value to the incoming OIP--that OIP which asks the user the yes/no question.
  _id: Number,

  // Contextual information about yes/no question this is configuring for which campaign. 
  __comments: String,

  // OIP of the conversation the user's opted into if she texts back "yes".
  yes: Number,

  // OIP of the conversation the user's opted into if she texts back "no".
  no: Number,

})

module.exports = function(connection) {
  return connection.model('yes_no_paths_config', yesNoPathsConfigSchema);
}