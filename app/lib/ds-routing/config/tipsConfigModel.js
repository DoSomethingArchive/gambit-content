/**
 * Model for the tips configuration document. 
 */
var mongoose = require('mongoose');

var tipsConfigSchema = new mongoose.Schema({
  tips: Schema.Types.Mixed
})

module.exports = mongoose.model('tips_config', tipsConfigSchema);