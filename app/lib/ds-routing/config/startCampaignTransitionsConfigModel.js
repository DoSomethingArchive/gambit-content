/**
 * Model for the start campaign transitions configuration document. Each 
 * object corresponds to one campaign's transition flow which a) opts the 
 * user out of the campaign's introductory conversation, and b) opts the 
 * user into the main conversation of the campaign. 
 */
var mongoose = require('mongoose');

var startCampaignTransitionsConfigSchema = new mongoose.Schema({

  // Reassigning the _id value to the unique id of the mData which controls this campaign transitions flow. 
  _id : Number,

  // Which campaign this config doc corresponds to. 
  __comments: String,

  // OIP of the main campaign conversation we're opting the user into. 
  optin: Number,

  // OIP of the intro campaign conversation we're opting the user out of. 
  optout: Number

})

module.exports = function(connection) {
  return connection.model('start_campaign_transitions_config', startCampaignTransitionsConfigSchema);
}