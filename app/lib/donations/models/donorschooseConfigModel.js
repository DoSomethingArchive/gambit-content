/**
 * Model for the DonorsChoose SMS configuration document. Each 
 * object corresponds to one DonorsChoose donation endgame flow.
 */
var mongoose = require('mongoose');

var donorschooseConfigSchema = new mongoose.Schema({

  // Reassigning the _id value. 
  _id : Number,

  // Contextual information about the donorschoose donation flow. 
  __comments: String,

  start_donation_flow: Number,

  ask_email: Number,

  donation_complete_project_info_A: Number,

  donation_complete_project_info_B: Number,

  donation_complete_give_url: Number,

  max_donations_reached_oip: Number,

  error_start_again: Number,

  max_donations_allowed: Number
})

module.exports = function(connection) {
  return connection.model(app.ConfigName.DONORSCHOOSE, donorschooseConfigSchema, 'donorschoose'); // Third param explicitly setting the name of the collection. 
}