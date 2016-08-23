/**
 * Globally-accessible object of config names.
 */
app.ConfigName = {
  CAMPAIGN_TRANSITIONS: 'start_campaign_transition',
  DONORSCHOOSE: 'donorschoose',
  DONORSCHOOSE_BOTS: 'donorschoose_bots',
  REPORTBACK: 'reportback',
  YES_NO_PATHS: 'yes_no_path'
};

var connectionOperations = require('./connectionOperations');
var connectionConfig = require('./connectionConfig');
var configModelArray = [
  rootRequire('app/lib/donations/models/donorsChooseBotModel')(connectionConfig),
  rootRequire('app/lib/donations/models/donorsChooseMocoCampaignModel')(connectionConfig),
  rootRequire('app/lib/ds-routing/config/startCampaignTransitionsConfigModel')(connectionConfig),
  rootRequire('app/lib/ds-routing/config/yesNoPathsConfigModel')(connectionConfig),
  rootRequire('app/lib/reportback/reportbackConfigModel')(connectionConfig),
];

var logger = rootRequire('app/lib/logger');

var configObject = {}
  , callback
  , numberOfModelsRemaining = configModelArray.length
  ;

/*
 * Imports the responder's configuration files and returns them through a callback. 
 *
 * @param _callback 
 *   Callback function to which the populated configObject is returned.
 */
var smsConfigsLoader = function(_callback) {
  callback = _callback;
  for (var i = 0; i < configModelArray.length; i++) {
    configModelArray[i].find({}, function(err, docs) {
      if (err) {
        logger.error('Error retrieving responder config files. Error: ' + err);
      }
      else if (docs.length > 0) {
        var modelName = docs[0].__proto__.constructor.modelName;
        configObject[modelName] = docs;
        onRetrievedConfig();
      }
    })
  }
}

function onRetrievedConfig() {
  numberOfModelsRemaining--
  if (numberOfModelsRemaining == 0) {
    app.configs = configObject;
    callback();
  }
}

/*
 * Globally-accessible function to retrieve SMS configs. 
 * 
 * @param modelName
 *   Name of model we're searching for. Must match the prescribed Mongoose model name exactly.
 * @param documentId
 *   _id of the config document we're searching for. 
 * @param key
 *   Optional. Key to use instead of _id to search for the doc.
 *   @todo -- do we ever use this?
 * 
 * @returns 
 *   Config document.
 */
app.getConfig = function(modelName, documentId, key) {
  logger.debug('smsConfigsLoader.getConfig for modelName:' + modelName + ' documentId:' + documentId + ' key:' + key);
  var configArray
    , i
    , keyMatches
    , idMatches
    ;

  configArray = this.configs[modelName];
  for (i = 0; i < configArray.length; i++) {
    keyMatches = typeof key !== 'undefined' && configArray[i][key] == documentId;
    idMatches = configArray[i]._id == documentId;

    if (keyMatches || idMatches) {
      logger.log('verbose', 'smsConfigsLoader.getConfig:%s', JSON.stringify(configArray[i]));
      return configArray[i];
    }
  }
  logger.error('smsConfigsLoader.getConfig document not found for modelName:' + modelName + ' documentId:' + documentId + ' key:' + key);
};

module.exports = smsConfigsLoader;
