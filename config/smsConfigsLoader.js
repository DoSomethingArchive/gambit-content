'use strict';

const logger = rootRequire('lib/logger');

/**
 * Globally-accessible object of config names.
 */
app.ConfigName = {
  CAMPAIGN_TRANSITIONS: 'start_campaign_transition',
  CAMPAIGNBOTS: 'campaignbots',
  CAMPAIGNS: 'campaigns',
  CHATBOT_MOBILECOMMONS_CAMPAIGNS: 'chatbot_mobilecommons_campaigns',
  DONORSCHOOSEBOTS: 'donorschoosebots',
  REPORTBACK: 'reportback',
  YES_NO_PATHS: 'yes_no_path',
};

const conn = require('./connectionConfig');
const configModelArray = [
  rootRequire('api/models/ChatbotMobileCommonsCampaign')(conn),
  rootRequire('api/models/campaign/Campaign')(conn),
  rootRequire('api/models/campaign/CampaignBot')(conn),
  rootRequire('api/models/donation/DonorsChooseBot')(conn),
  rootRequire('api/legacy/ds-routing/config/startCampaignTransitionsConfigModel')(conn),
  rootRequire('api/legacy/ds-routing/config/yesNoPathsConfigModel')(conn),
  rootRequire('api/legacy/reportback/reportbackConfigModel')(conn),
];

const configModels = {
  campaigns: rootRequire('api/models/campaign/Campaign')(conn),
  campaignBots: rootRequire('api/models/campaign/CampaignBot')(conn),
  chatbotMobilecommonsCampaigns: rootRequire('api/models/ChatbotMobileCommonsCampaign')(conn),
  donorsChooseBots: rootRequire('api/models/donation/DonorsChooseBot')(conn),
  // Legacy collections:
  reportbacks: rootRequire('api/legacy/reportback/reportbackConfigModel')(conn),
  startCampaignTransitions: rootRequire('api/legacy/ds-routing/config/startCampaignTransitionsConfigModel')(conn),
  yesNoPaths: rootRequire('api/legacy/ds-routing/config/yesNoPathsConfigModel')(conn),
};
let numConfigsLoaded = 0; 


const configObject = {};
let callback;
let numberOfModelsRemaining = configModelArray.length;


/*
 * Imports the responder's configuration files and returns them through a callback.
 *
 * @param _callback
 *   Callback function to which the populated configObject is returned.
 */
app.loadConfigs = function () {
  const promises = [];
  Object.keys(configModels).forEach(function(configName, index) {
    const model = configModels[configName];
    const promise = model.find({}).exec().then((configDocs) => {
      const configMap = {};
      configDocs.forEach((configDoc) => {
        configMap[configDoc._id] = configDoc;
      });
      let configResponse = {};
      configResponse[configName] = configMap;
      return configResponse;
    });
    promises.push(promise);
  });

  return promises;
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
  logger.debug('smsConfigsLoader.getConfig modelName:%s documentId:%s',
    modelName, documentId);

  var keyMatches;
  var idMatches;
  const configArray = app.locals.configs[modelName];
  console.log(configArray);
  for (var i = 0; i < configArray.length; i++) {
    keyMatches = typeof key !== 'undefined' && configArray[i][key] == documentId;
    idMatches = configArray[i]._id == documentId;

    if (keyMatches || idMatches) {
      logger.log('verbose', 'smsConfigsLoader.getConfig:%s', JSON.stringify(configArray[i]));
      return configArray[i];
    }
  }
  logger.error('smsConfigsLoader.getConfig document not found for modelName:' + modelName + ' documentId:' + documentId + ' key:' + key);
};

