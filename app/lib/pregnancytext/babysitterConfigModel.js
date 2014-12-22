/**
 * Model for the pregnancy text campaign's babysitter config files. 
 */
var mongoose = require('mongoose');

var babysitterConfigSchema = new mongoose.Schema({

  // Reassigning the _id value to a mostly arbitrary config object id.
  _id: Number,

  optinParentOnInviteAlpha: Number,

  optinParentOnInviteBeta: Number,

  campaignIdParentNoBsAlpha: Number,

  campaignIdParentNoBsBeta: Number,

  campaignIdParentNoBsResurrected: Number,

  optinBsOnInvite: Number,

  genericResponses: [Number]

})

module.exports = function(connection) {
  return connection.model('babysitter_config', babysitterConfigSchema);
}