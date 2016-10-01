'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const logger = rootRequire('lib/logger');

const conn = require('./connectionConfig');
const configModels = {
  campaigns: rootRequire('api/models/campaign/Campaign')(conn),
  campaignBots: rootRequire('api/models/campaign/CampaignBot')(conn),
  chatbotMobileCommonsCampaigns: rootRequire('api/models/ChatbotMobileCommonsCampaign')(conn),
  donorsChooseBots: rootRequire('api/models/donation/DonorsChooseBot')(conn),
  // Legacy collections:
  legacyReportbacks: rootRequire('api/legacy/reportback/reportbackConfigModel')(conn),
  legacyStartCampaignTransitions: rootRequire('api/legacy/ds-routing/config/startCampaignTransitionsConfigModel')(conn),
  legacyYesNoPaths: rootRequire('api/legacy/ds-routing/config/yesNoPathsConfigModel')(conn),
};

app.loadLocals = function () {

  const opsDbUri = process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder';
  const connOps = mongoose.createConnection(opsDbUri);
  connOps.on('connected', () => {  
    logger.info(`connOps readyState:${connOps.readyState}`);
  });
  app.locals.db = {
    donorsChooseDonations: rootRequire('api/models/donation/DonorsChooseDonation')(connOps),
    legacyReportbacks: rootRequire('api/legacy/reportback/reportbackModel')(connOps),
    reportbackSubmissions: rootRequire('api/models/campaign/ReportbackSubmission')(connOps),
    signups: rootRequire('api/models/campaign/Signup')(connOps),
    users: rootRequire('api/models/User')(connOps),
  };

  const promises = [];
  Object.keys(configModels).forEach(function(configName) {
    const model = configModels[configName];
    const promise = model.find({}).exec().then((configDocs) => {
      const configMap = {};
      configDocs.forEach((configDoc) => {
        if (configName === 'legacyReportbacks') {
          // Legacy reportback endpoint loads its config based by the endpoint property. 
          configMap[configDoc.endpoint] = configDoc;
        }
        else {
          configMap[configDoc._id] = configDoc;
        }
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
    // TODO: We'll need to loop through all campaignBots and store as app.locals.campignBots map.
    // For now we only have one default CampaignBot (id 41) to use for all DS Campaigns.
    // TODO: Add config variable to avoid hardcoding default CampaignBot.
    const campaignBot = app.locals.configs.campaignBots[41];
    app.locals.campaignBot = new CampaignBotController(campaignBot);

    const DonorsChooseBotController = rootRequire('api/controllers/DonorsChooseBotController');
    const donorsChooseBot = app.locals.configs.donorsChooseBots[process.env.DONORSCHOOSEBOT_ID];
    const dcMocoId = process.env.DONORSCHOOSE_MOCO_CAMPAIGN_ID;
    const dcMocoCampaign = app.locals.configs.chatbotMobileCommonsCampaigns[dcMocoId];
    app.locals.donorsChooseBot = new DonorsChooseBotController(donorsChooseBot, dcMocoCampaign);

    const SlothBotController = rootRequire('api/controllers/SlothBotController');
    app.locals.slothBot = new SlothBotController();

    return true;
  });
}
