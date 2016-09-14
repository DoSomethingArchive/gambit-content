"use strict"

var requestHttp = require('request');
var logger = rootRequire('lib/logger');

const donorsChooseBotProperties = [
  'msg_ask_email',
  'msg_ask_first_name',
  'msg_ask_zip',
  'msg_donation_success',
  'msg_error_generic',
  'msg_invalid_email',
  'msg_invalid_first_name',
  'msg_invalid_zip',
  'msg_project_link',
  'msg_max_donations_reached',
  'msg_search_start',
  'msg_search_no_results'
];

/**
 * Query Gambit Jr. API to sync config collection for given bot type
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {string} type - Chatbot type. expected: donorschoosebot | campaignbot
 */
module.exports.syncBotConfigs = function(req, res, type) {
  var url = 'http://dev-gambit-jr.pantheonsite.io/wp-json/wp/v2/' + type + 's';
  logger.debug('gambit-junior url:%s', url);

  // @todo Add campaignBotProperties and check for botType
  var propertyNames = donorsChooseBotProperties;

  requestHttp.get(url, function(error, response, body) {
    if (error) {
      res.status(500);
      return;
    }
    var bots = JSON.parse(body);
    logger.verbose(bots);
    var bot, configDoc, propertyName;
    for (var i = 0; i < bots.length; i++) {
      bot = bots[i];
      // @todo configName must be a variable
      configDoc = app.getConfig(app.ConfigName.DONORSCHOOSE_BOTS, bot.id);
      if (!configDoc) {
        logger.log('info', 'gambit-junior no config for bot_id:%s', bot.id);
        continue;
      }
      for (var j = 0; j < propertyNames.length; j++) {
        propertyName = propertyNames[j];
        configDoc[propertyName] = bot[propertyName];
      }
      configDoc.name = bot.title;
      configDoc.refreshed_at = Date.now();
      configDoc.save();
      logger.log('info', 'gambit-junior sync success bot_id:%s', bot.id);
    }
    res.send();
  });
}
