/*
 * Imports the responder's configuration files and attaches them to the app 
 * object in memory. 
 */

var tipsConfigModel = require('../lib/ds-routing/config/tipsConfigModel')
  // , connectionOperations = require('./connectionOperations')
  // , connectionConfig = require('./connectionConfig')
  // , competitiveStoryConfigModel = require('../lib/sms-games/config/competitiveStoryConfigModel')
  // , donorschooseConfigModel = require('../lib/donations/config/donorschooseConfigModel')
  // , campaignStartConfigModel = require('../lib/sms-games-config/campaignStartConfigModel')
  // , 


var configLoader = function() {
  var connectionOperations = require('./connectionOperations')
  var connectionConfig = require('./connectionConfig')
    , tipsConfigModel = require('../lib/ds-routing/config/tipsConfigModel')(connectionConfig)
    ;

  var configModelArray = [tipsConfigModel];
  var configObject = {};

  for (var i = 0; i < configModelArray.length; i++) {
    var modelName = configModelArray[i].modelName;
    configModelArray[i].find({}, function(err, docs) {
      if (err) {
        logger.error('Error retrieving responder config files. Error: ' + err);
      }
      else {
        configObject[modelName] = docs;
      }
    })
  }
  return configObject;
}

module.exports = configLoader;