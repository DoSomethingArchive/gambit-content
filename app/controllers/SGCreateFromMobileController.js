"use strict";

/**
 * Guides users through creating an SMS multiplayer game from mobile.
 */

var mobilecommons = require('../../mobilecommons/mobilecommons')
  , messageHelper = require('../lib/userMessageHelpers')
  ;

var SGCreateFromMobileController = function(app) {
  this.app = app;
  this.configModel = require('../models/sgGameCreateConfig')(app);
};

function createGame(gameConfig) {
  // @todo POST to /sms-multiplayer-game/create
  console.log('create the game!');
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
  return messageHelper.isValidPhone(messageHelper.getNormalizedPhone(message));
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
 * Receives a user's mobile responses through the create game process.
 *
 * @param request
 *   Express request object.
 * @param response
 *   Express response object.
 */
SGCreateFromMobileController.prototype.processRequest = function(request, response) {

  if (typeof request.query.story_id === 'undefined'
      || typeof request.query.story_type === 'undefined'
      || typeof request.body.phone === 'undefined'
      || typeof request.body.args === 'undefined') {
    response.send(406, 'Missing required params.');
    return false;
  }

  // @todo When collaborative and most-likely-to games happen, set configs here.
  // Verify game type and id are valid.
  if (request.query.story_type == 'competitive-story') {
    this.gameConfig = this.app.get('competitive-stories');
  }
  else {
    response.send(406, 'Invalid story_type.')
    return false;
  }

  if (typeof this.gameConfig[request.query.story_id] === 'undefined') {
    response.send(406, 'Game config not setup for story ID: ' + request.query.story_id);
    return false;
  }

  var self = this;
  self.storyConfig = this.gameConfig[request.query.story_id];
  self.request = request;
  self.response = response;

  // Query for an existing game creation config doc.
  var queryConfig = this.configModel.findOne({alpha_mobile: request.body.phone});
  var promiseConfig = queryConfig.exec();
  promiseConfig.then(function(configDoc) {

    // If no document found, then create one.
    if (configDoc == null) {
      // We don't ask for the first name yet, so just saving it as phone for now.
      var doc = {
        alpha_mobile: self.request.body.phone,
        alpha_first_name: self.request.body.phone,
        story_id: self.request.query.story_id,
        story_type: self.request.query.story_type
      };

      return self.configModel.create(doc);
    }
    // If a document is found, then process the user message.
    else {
      var message = self.request.body.args;
      // Create the game if we have at least one beta number
      if (messageHelper.isYesResponse(message)) {
        if (configDoc.beta_mobile_0 && messageHelper.isValidPhone(configDoc.beta_mobile_0)) {
          createGame(configDoc);
        }
        else {
          // Send the "not enough players" message.
          sendSMS(configDoc.alpha_mobile, self.storyConfig.mobile_create.not_enough_players_oip);
        }
      }
      else if (isPhoneNumber(message)) {
        var betaMobile = messageHelper.getNormalizedPhone(message);

        // If we haven't saved a beta number yet, save it to beta_mobile_0.
        if (!configDoc.beta_mobile_0) {
          configDoc.beta_mobile_0 = betaMobile;
          self._updateDocument(configDoc);

          // Then ask for beta_mobile_1.
          sendSMS(configDoc.alpha_mobile, self.storyConfig.mobile_create.ask_beta_1_oip);
        }
        // If we haven't saved the 2nd beta number yet, save it to beta_mobile_1.
        else if (!configDoc.beta_mobile_1) {
          configDoc.beta_mobile_1 = betaMobile;
          self._updateDocument(configDoc);

          // Then ask for beta_mobile_2.
          sendSMS(configDoc.alpha_mobile, self.storyConfig.mobile_create.ask_beta_2_oip);
        }
        // At this point, this is the last number we need. So, create the game.
        else {
          configDoc.beta_mobile_2 = betaMobile;
          createGame(configDoc);
        }
      }
      else {
        // Send the "invalid response" message.
        sendSMS(configDoc.alpha_mobile, self.storyConfig.mobile_create.invalid_mobile_oip);
      }

      throw new ErrorAbortPromiseChain();
      return null;
    }

  }).then(function(configDoc) {

    // Config model has been successfully created.
    if (configDoc) {
      // User should have responded with beta_mobile_0.
      var message = self.request.body.args;
      if (isPhoneNumber(message)) {
        // Update doc with beta_mobile_0 number.
        // var doc = modelConfig._doc;
        configDoc.beta_mobile_0 = messageHelper.getNormalizedPhone(message);
        self._updateDocument(configDoc);

        // Send next message asking for beta_mobile_1.
        sendSMS(configDoc.alpha_mobile, self.storyConfig.mobile_create.ask_beta_1_oip);
      }
      else {
        // If user responded with something else, ask for a valid phone number.
        sendSMS(configDoc.alpha_mobile, self.storyConfig.mobile_create.invalid_mobile_oip);
      }
    }

  }, function(err) {
    // ErrorAbortPromiseChain is ok. Otherwise, log the error.
    if (!(err instanceof ErrorAbortPromiseChain)) {
      console.log(err);
    }
  });

  response.send();
};

/**
 * Update the game creation config doc with beta mobile numbers.
 *
 * @param configDoc
 *   The document with updated data.
 */
SGCreateFromMobileController.prototype._updateDocument = function(configDoc) {
  this.configModel.update(
    {alpha_mobile: configDoc.alpha_mobile},
    {$set: {
      beta_mobile_0: configDoc.beta_mobile_0 ? configDoc.beta_mobile_0 : null,
      beta_mobile_1: configDoc.beta_mobile_1 ? configDoc.beta_mobile_1 : null,
      beta_mobile_2: configDoc.beta_mobile_2 ? configDoc.beta_mobile_2 : null,
    }},
    function(err, num, raw) {
      if (err) {
        console.log(err);
      }
      else {
        console.log(raw);
      }
    }
  );
};

module.exports = SGCreateFromMobileController;
