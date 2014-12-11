/**
 * Model for the tips configuration document. Each object corresponds to one section of 
 * the campaign tips flow, for instance: "Birthday Mail 2014 - KNOW". 
 */
var mongoose = require('mongoose');

var tipsConfigSchema = new mongoose.Schema({

  // Reassigning the _id value to the unique id of the mData which controls the tips flow. Automatically indexed. 
  _id : Number,

  // Contextual information about the campaign. For instance: "Fifth Harmony #ImABoss 2014 - DO". 
  __comments: String,

  // Name of this stage in the tips flow. Also corresponds to the name of the mData. 
  name : String,

  // Array of optin path IDs corresponding to the messages sent to the user by the tips mData.
  optins : [Number],

})

module.exports = mongoose.model('tips_config', tipsConfigSchema);