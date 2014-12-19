var connectionOperations = require('./connectionOperations')
  , connectionConfig = require('./connectionConfig')
  , configModelArray = [
      rootRequire('app/lib/ds-routing/config/tipsConfigModel')(connectionConfig)
    , rootRequire('app/lib/donations/models/donorschooseConfigModel')(connectionConfig)
    , rootRequire('app/lib/ds-routing/config/campaignStartConfigModel')(connectionConfig)
    , rootRequire('app/lib/')
    ]
  ;

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
 * @param id
 *   _id of the config document we're searching for. 
 * 
 * @returns 
 *   Config document. 
 */
app.getConfig = function(modelName, id) {
  var configArray = this.configs[modelName];
  for (var i = 0; i < configArray.length; i++) {
    if (configArray[i]._id == id) {
      return configArray[i];
    }
  }
  logger.error('Unable to find requested config document for config model: ' + modelName + ' with id: ' + id);
}

module.exports = smsConfigsLoader;