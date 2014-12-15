var connectionOperations = require('./connectionOperations')
  , connectionConfig = require('./connectionConfig')
  , configModelArray = [
      require('../lib/ds-routing/config/tipsConfigModel')(connectionConfig)
    ]
  ;

var configObject = {}
  , callback
  , numberOfModelsRemaining = configModelArray.length
  ;

console.log('within smsConfigsLoader.js');

/*
 * Imports the responder's configuration files and returns them through a callback. 
 *
 * @param _callback 
 *   Callback function to which the populated configObject is returned.
 */
var smsConfigsLoader = function(_callback) {
  callback = _callback;
  console.log("smsConfigsLoader has been called: " + configModelArray.length);
  for (var i = 0; i < configModelArray.length; i++) {
    var modelName = configModelArray[i].modelName;
    console.log('model name: ' + modelName);
    configModelArray[i].find({}, function(err, docs) {
      console.log('within callback of mongo call')

      if (err) {
        logger.error('Error retrieving responder config files for the model: ' + configModelArray[i].modelName + '. Error: ' + err);
      }
      else {
        configObject[modelName] = docs;
      }

      onRetrievedConfig();
    })
  }
}

function onRetrievedConfig() {
  console.log("onRetrievedConfig has been called");
  numberOfModelsRemaining --
  if (numberOfModelsRemaining == 0) {
    callback(configObject);
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
  for (var i = 0; i < configArray.length; i ++) {
    if (configArray[i]._id == id) {
      return configArray[i];
    }
  }
  logger.error('Unable to find requested config document for config model: ' + modelName + ' with id: ' + id);
}

module.exports = smsConfigsLoader;