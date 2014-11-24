var mobilecommons = require('../../../../mobilecommons')
  , emitter = require('../../../eventEmitter')
  , userModel = require('../models/sgUser')
  , gameModel = require('../models/sgCompetitiveStory')
  , utility = require('./gameUtilities')
  ;

/**
 * Schedule a message to be sent to a SINGLE user via a Mobile Commons optin.
 *
 * @param phoneNumber
 *   The phone number of the user.
 * @param optinPath
 *   The opt in path of the message we want to send the user. 
 */
module.exports.singleUser = function(phoneNumber, optinPath) {
  var args = {
    alphaPhone: phoneNumber,
    alphaOptin: optinPath
  };
  mobilecommons.optin(args);
  emitter.emit('single-user-opted-in', args); // Event currently used in testing. 
}

/**
 * Schedule a message to be sent to a GROUP of users via Mobile Commons optins.
 *
 * @param alphaPhone
 *   The phone number of the alpha user. (For the purposes of this function, 
 *   it's arbitrary which phone is designated the alpha, and which phones are
 *   designated the betas. This distinction is only important because all the 
 *   beta numbers will be opted into the same distinct opt in path.) 
 * @param alphaOptin
 *   The opt in path of the alpha user. 
 * @param singleBetaPhoneOrArrayOfPhones
 *   Can take either a 1) a number or string representing a single beta phone
 *   or 2) an array of phones representing more than one beta phone. 
 * 
 * @param betaOptin
 *    The opt in path for ALL the beta phones. 
 */
module.exports.group = function(alphaPhone, alphaOptin, singleBetaPhoneOrArrayOfPhones, betaOptin) {
  var args = {
    alphaPhone: alphaPhone,
    alphaOptin: alphaOptin,
    betaOptin: betaOptin, 
    betaPhone: singleBetaPhoneOrArrayOfPhones
  };
  mobilecommons.optin(args);
  emitter.emit('group-of-users-opted-in', args); // Event currently unused in testing. 
}

/**
 * Schedule a delayed message to be sent to a SINGLE user via Mobile Commons optin. 
 * After the delay time period has passed, this function first checks to see whether 
 * or not the user has been invited into another game by determining if the userModel 
 * of that user has a .current_game_id property different than the currentGameId param 
 * passed into the function. 
 *
 * @param phoneNumber
 *   The phone number of the user we're sending a delayed message. 
 * @param optinPath
 *   The opt in path of the message we're sending the user. 
 * @param delay
 *   The length of time, in milliseconds, before the message is sent (or not sent, if the user has invited
 *   to another game.)
 * @param currentGameId
 *   The Mongo-generated game id of the current game we are calling this function on.
 * @param userModel
 *   A reference to Mongoose userModel to which we're querying in order to retrieve 
 *   the specific user's user document.
 */
module.exports.singleUserWithDelay = function(phoneNumber, optinPath, delay, currentGameId, userModel) {
  if (!phoneNumber || !optinPath || !delay || !currentGameId || !userModel) {
    return;
  }

  function sendSMS(_phoneNumber, _optinPath, _currentGameId, _userModel) {
    _userModel.findOne({phone: _phoneNumber}, function(err, userDoc) {
      if (!err) {
        // If a user's in a game that has been ended, the current_game_id property will be removed
        // from her user document. Checking to see if current_game_id still exists for that user. 
        if (userDoc.current_game_id && (userDoc.current_game_id.equals(_currentGameId))) {
          var args = {alphaPhone: _phoneNumber, alphaOptin: _optinPath};
          mobilecommons.optin(args);
          emitter.emit('single-user-opted-in-after-delay', args); // Event currently unused in testing. 
        }
        else {
          logger.info('**A player in the previous game has been invited to a new',
                      'game, and no one in the previous game will now receive',
                      'delayed end-level or end-game messages!**');
        }
      }
      else {
        logger.error('Error in delayedOptinSinglerUser(): ', err);
      }
    });
  }
  setTimeout(function() { sendSMS(phoneNumber, optinPath, currentGameId, userModel); }, delay);
}

/**
 * Schedule a message to be sent to ask Alpha if she wants to play solo.
 *
 * @param gameId
 *   Game ID of the game to check.
 * @param gameModel
 *   Mongoose model to search with.
 * @param oip
 *   Solo-play opt-in path.
 */
module.exports.giveSoloOptionAfterDelay = function(gameId, gameModel, oip, delay) {
  var checkIfBetaJoined = function(_gameId, _gameModel, _oip) {
    var findGame = _gameModel.findById(_gameId).exec();
    findGame.then(function(doc) {
      var aBetaHasJoined = false;
      for (var i = 0; i < doc.betas.length; i++) {
        if (doc.betas[i].invite_accepted == true) {
          aBetaHasJoined = true;
          break;
        }
      }
      // If no Betas have joined and the game-type is NOT solo, ask the alpha
      // if she wants to play SOLO.
      if ((!aBetaHasJoined) && (doc.game_type !== 'solo')) {
        optinSingleUser(doc.alpha_phone, _oip);
      }
    }, utility.promiseErrorCallback('Unable to find game.'));
  };

  setTimeout(function(){ checkIfBetaJoined(gameId, gameModel, oip) }, delay);
}