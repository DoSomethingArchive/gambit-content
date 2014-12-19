/**
 * Model for the campaign-start SMS configuration document, where the user is 
 * first asked for what stage of the campaign she wants to learn more about,
 * and then opted into a conversation explaining that stage. Each 
 * object corresponds to one campaign's campaign-start configuration. 
 */
var mongoose = require('mongoose');

var campaignStartConfigSchema = new mongoose.Schema({

  // Reassigning the _id value to the unique id of the OIP which asks the user a multiple-choice question. Automatically indexed. 
  _id: Number,

  // Contextual information about the campaign this is configuring. 
  __comments: String,

  // OIP which corresponds to the KNOW conversation of this campaign. 
  know: Number,

  // OIP which corresponds to the PLAN conversation of this campaign.
  plan: Number,

  // OIP which corresponds to the DO conversation of this campaign. 
  do: Number,

  // OIP which corresponds to the PROVE reportback conversation of this campaign.
  prove: Number

})

module.exports = function(connection) {
  return connection.model('campaign_start_config', campaignStartConfigSchema);
}