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
const configModels = {
  campaigns: rootRequire('api/models/campaign/Campaign')(conn),
  campaignBots: rootRequire('api/models/campaign/CampaignBot')(conn),
  chatbotMobileCommonsCampaigns: rootRequire('api/models/ChatbotMobileCommonsCampaign')(conn),
  donorsChooseBots: rootRequire('api/models/donation/DonorsChooseBot')(conn),
  // Legacy collections:
  legacyReportbacks: rootRequire('api/legacy/reportback/reportbackConfigModel')(conn),
  legacyCampaignTransitions: rootRequire('api/legacy/ds-routing/config/startCampaignTransitionsConfigModel')(conn),
  legacyYesNoPaths: rootRequire('api/legacy/ds-routing/config/yesNoPathsConfigModel')(conn),
};


app.loadConfigs = function () {
  const promises = [];
  Object.keys(configModels).forEach(function(configName) {
    const model = configModels[configName];
    const promise = model.find({}).exec().then((configDocs) => {
      const configMap = {};
      configDocs.forEach((configDoc) => {
        configMap[configDoc._id] = configDoc;
      });
      return {
        name: configName,
        count: configDocs.length,
        data: configMap,
      };
    });
    promises.push(promise);
  });

  return Promise.all(promises).then((collections) => {
    // Initialize our app.locals.configs map.
    app.locals.configs = {};
    collections.forEach(function(collection) {
      app.locals.configs[collection.name] = collection.data;
      logger.debug(`loaded ${collection.count} app.locals.configs.${collection.name}`);
    }); 

    const CampaignBotController = rootRequire('api/controllers/CampaignBotController');
    const SlothBotController = rootRequire('api/controllers/SlothBotController');

    // TODO: We'll need to loop through all campaignBots and store as app.locals.campignBots map.
    // For now we only have one default CampaignBot (id 41) to use for all DS Campaigns.
    // TODO: Add config variable to avoid hardcoding default CampaignBot.
    const campaignBot = app.locals.configs.campaignBots[41];
    
    app.locals.campaignBot = new CampaignBotController(campaignBot);
    app.locals.slothBot = new SlothBotController();
    return true;
  });
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

