"use strict";

/**
 * Guides users through creating an SMS multiplayer game from mobile.
 * Not used for SOLO mobile game creation, though. (See SGSoloController.js.)
 */

var requestHttp = require('request')
  , mobilecommons = rootRequire('mobilecommons')
  , smsHelper = rootRequire('app/lib/smsHelpers')
  , logger = rootRequire('app/lib/logger')
  , connectionOperations = rootRequire('app/config/connectionOperations')
  , configModel = require('../models/sgGameCreateConfig')(connectionOperations)
  ;

var SGCreateFromMobileController = function(host) {
  this.host = host; // Reference for application host. 
  this.game_type; // Flag for type of game (competitive, collaborative). Currently used. 
};

/**
 * Receives a user's mobile responses through the create game process.
 *
 * @param request
 *   Express request object.
 * @param response
 *   Express response object.
 */
SGCreateFromMobileController.prototype.processRequest = function(request, response) {
  var self
    , request
    , response
    , gameConfig
    ;

  if (typeof request.query.story_id === 'undefined'
      || typeof request.query.story_type === 'undefined'
      || typeof request.body.phone === 'undefined'
      || typeof request.body.args === 'undefined') {
    response.status(406).send('Missing required params.');
    return false;
  }

  if (request.query.game_type) {
    this.game_type = request.query.game_type;
  } 

  // @todo When collaborative and most-likely-to games happen, set configs here.
  // Verify game type and id are valid. By default, set to competitive-story.
  var gameConfigNameString = app.ConfigName.COMPETITIVE_STORIES;
  if (request.query.story_type != 'competitive-story') {
    response.status(406).send('Invalid story_type.')
    return false;
  }

  self = this;
  request = request;
  response = response;
  gameConfig = app.getConfig(gameConfigNameString, request.query.story_id);

  if (typeof gameConfig === 'undefined') {
    response.status(406).send('Game config not set up for story ID: ' + request.query.story_id);
    return false;
  }

  // Query for an existing game creation config doc.
  var queryConfig = configModel.findOne({alpha_mobile: request.body.phone});
  var promiseConfig = queryConfig.exec();
  promiseConfig.then(function(configDoc) {
    debugger;
    // If no document found, then create one. This game creation config doc 
    // should NOT be confused with the game doc, or the gameConfig. It's destroyed
    // after the game is begun; it's used only for game creation. 
    if (configDoc == null) {
      // We don't ask for the first name yet, so just saving it as phone for now.
      var doc = {
        alpha_mobile: request.body.phone,
        alpha_first_name: request.body.phone,
        story_id: request.query.story_id,
        story_type: request.query.story_type,
        game_type: (request.query.game_type || '')
      };

      // User should have responded with the alpha name.
      var message = request.body.args;
      if (smsHelper.hasLetters(message)) {
        doc.alpha_first_name = smsHelper.getLetters(message);
        // Send next message asking for beta_mobile_1.
        sendSMS(request.body.phone, gameConfig.mobile_create.ask_beta_0_oip);
      }
      else {
        // If user responded with something else, ask for a valid player name. 
        sendSMS(request.body.phone, gameConfig.mobile_create.invalid_alpha_first_name);
      }
      configModel.create(doc);
    }
    // If a document is found, then process the user message.
    else {
      var message = request.body.args;
      // Create the game if we have at least one beta number.
      // If the alpha responds 'Y' to the 'create game now?' query. 
      if (smsHelper.isYesResponse(message)) {
        if (configDoc.beta_mobile_0 && smsHelper.isValidPhone(configDoc.beta_mobile_0)) {
          // While it may seem that the two calls below may produce asynchronous weirdness, they don't. 
          createGame(configDoc, self.host);
          self._removeDocument(configDoc.alpha_mobile);
        }
        else {
          // Send the "not enough players" message.
          sendSMS(configDoc.alpha_mobile, gameConfig.mobile_create.not_enough_players_oip);
        }
      }
      // If the message contains a valid phone number and beta name. 
      else if (isPhoneNumber(message) && smsHelper.hasLetters(message)) {
        var betaMobile = smsHelper.getNormalizedPhone(message);
        var betaName = smsHelper.getLetters(message);

        // If we haven't saved a beta number yet, save it to beta_mobile_0.
        if (!configDoc.beta_mobile_0 && !configDoc.beta_first_name_0) {
          configDoc.beta_mobile_0 = betaMobile;
          configDoc.beta_first_name_0 = betaName;
          self._updateDocument(configDoc);

          // Then ask for beta_mobile_1.
          sendSMS(configDoc.alpha_mobile, gameConfig.mobile_create.ask_beta_1_oip);
        }
        // If we haven't saved the 2nd beta number yet, save it to beta_mobile_1.
        else if (!configDoc.beta_mobile_1 && !configDoc.beta_first_name_1) {
          configDoc.beta_mobile_1 = betaMobile;
          configDoc.beta_first_name_1 = betaName;
          self._updateDocument(configDoc);

          // Then ask for beta_mobile_2.
          sendSMS(configDoc.alpha_mobile, gameConfig.mobile_create.ask_beta_2_oip);
        }
        // At this point, this is the last number we need. So, create the game.
        else {
          configDoc.beta_mobile_2 = betaMobile;
          configDoc.beta_first_name_2 = betaName;
          // Again, while it may seem that the two calls below may produce async disorderlyness, they don't. 
          createGame(configDoc, self.host);
          self._removeDocument(configDoc.alpha_mobile);
        }
      }
      // Send the "invalid response" message.
      else {
        sendSMS(configDoc.alpha_mobile, gameConfig.mobile_create.invalid_mobile_oip);
      }
    }
  }, function(err) {
    logger.error(err);
  })
  response.send();
};

/**
 * Create game by POSTing to the create game endpoint.
 *
 * @param gameCreateConfig
 *   Config model with game creation data.
 * @param host
 *   Hostname of this app.
 */
function createGame(gameCreateConfig, host) {
  var url = 'http://' + host + '/sms-multiplayer-game/create';
  var payload = {
    form: {
      alpha_mobile: gameCreateConfig.alpha_mobile,
      alpha_first_name: gameCreateConfig.alpha_first_name,
      beta_mobile_0: gameCreateConfig.beta_mobile_0,
      beta_first_name_0: gameCreateConfig.beta_first_name_0 ? gameCreateConfig.beta_first_name_0 : '',
      beta_mobile_1: gameCreateConfig.beta_mobile_1 ? gameCreateConfig.beta_mobile_1 : '',
      beta_first_name_1: gameCreateConfig.beta_first_name_1 ? gameCreateConfig.beta_first_name_1 : '',
      beta_mobile_2: gameCreateConfig.beta_mobile_2 ? gameCreateConfig.beta_mobile_2 : '',
      beta_first_name_2: gameCreateConfig.beta_first_name_2 ? gameCreateConfig.beta_first_name_2 : '',
      story_id: gameCreateConfig.story_id,
      story_type: gameCreateConfig.story_type
    }
  };

  requestHttp.post(url, payload, function(err, response, body) {
    if (err) {
      logger.error(err);
    }

    if (response && response.statusCode) {
      logger.info('SGCreateFromMobileController.createGame: POST to ' + url + ' returned status code: ' + response.statusCode);
    }
  });
};

/**
 * Helper function to normalize a potential phone number and check if it's valid.
 *
 * @param message
 *   Message to check.
 *
 * @param Boolean
 */
function isPhoneNumber(message) {
  return smsHelper.isValidPhone(smsHelper.getNormalizedPhone(message));
};

/**
 * Subscribe phone number to a Mobile Commons opt-in path.
 *
 * @param phone
 *  Phone number to subscribe.
 * @param oip
 *   Opt-in path to subscribe to.
 */
function sendSMS(phone, oip) {
  var args = {
    alphaPhone: phone,
    alphaOptin: oip
  };

  mobilecommons.optin(args);
};

/**
 * Custom error object used to break promise chain.
 */
function ErrorAbortPromiseChain() {
  this.name = 'ErrorAbortPromiseChain';
  this.message = 'Aborting the promise chain. This is totally OK.';
};

/**
 * Update the game creation config doc with beta mobile numbers.
 *
 * @param configDoc
 *   The document with updated data.
 */
SGCreateFromMobileController.prototype._updateDocument = function(configDoc) {
  configModel.update(
    {alpha_mobile: configDoc.alpha_mobile},
    {$set: {
      beta_mobile_0: configDoc.beta_mobile_0 ? configDoc.beta_mobile_0 : null,
      beta_mobile_1: configDoc.beta_mobile_1 ? configDoc.beta_mobile_1 : null,
      beta_mobile_2: configDoc.beta_mobile_2 ? configDoc.beta_mobile_2 : null,
      beta_first_name_0: configDoc.beta_first_name_0 ? configDoc.beta_first_name_0 : '',
      beta_first_name_1: configDoc.beta_first_name_1 ? configDoc.beta_first_name_1 : '',
      beta_first_name_2: configDoc.beta_first_name_2 ? configDoc.beta_first_name_2 : ''
    }},
    function(err, num, raw) {
      if (err) {
        logger.error(err);
      }
      else if (configDoc._id) {
        logger.info('SGCreateFromMobileController._updateDocument success for doc:', configDoc._id.toString());
      }
    }
  );
};

/**
 * Remove game creation config doc.
 *
 * @param phone
 *   Alpha mobile number.
 */
SGCreateFromMobileController.prototype._removeDocument = function(phone) {
  configModel.remove(
    {alpha_mobile: phone},
    function(err, num) {
      if (err) {
        logger.error(err);
      }
      else {
        logger.info('Number of game create config documents removed: ' + num);
      }
    }
  );
};

module.exports = SGCreateFromMobileController;