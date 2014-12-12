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
    , donationInfoModel = require('../lib/donations/models/DonationInfo')(connectionOperations)
    ;

  // some kind of loop, running through all the xxxConfigModels to .find() all the configDocs, attach those docs to the 

  tipsConfigModel.find({}, function(err, docs) {
    if (err) {
      logger.error('Error retrieving responder config files. Error: ' + err);
    }
    else {
      console.log(docs);
      return docs;
    }
  })

  // donationInfoModel.find({}, function(err, docs) {
  //   if (err) {
  //     logger.error('Error retrieving responder config files. Error: ' + err);
  //   }
  //   else {
  //     console.log(docs);
  //     // return docs;
  //   }
  // })
}

module.exports = configLoader;