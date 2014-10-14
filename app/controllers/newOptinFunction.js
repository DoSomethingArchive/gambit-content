function optin(phone, optinpath) {
  scheduleOptinForDelay(phone, optinpath, null, null)
}

function scheduleOptin(phone, path, delay, current_game_id, modelAttachedToControllerPrototype) {
  var sendSMS = function(args) {

  } 
}


    // find user doc through Mongo
    // check if user doc matches this.game_id
    // if so, then...

// There was a reason we were bundling arguments on functions before--there might have been alphas and betas, and we're trying to opt them into multiple opt in paths. 

function scheduleOptinForDelay(phone, path, delay, current_game_id, databaseModelAttachedToControllerPrototype) {
  var sendSMS = function(args) {
    if (this.game_id) {
      databaseModelAttachedToControllerPrototype.findOne({phone: phone}, function(err, userDoc) {
        if (userDoc.current_game_id == current_game_id) {
          mobilecommons.optin({'alphaPhone': phone, 'alphaOptIn': path});
        }
      }) // confirm this 
    }
    else {
      mobilecommons.optin({'alphaPhone': phone, 'alphaOptIn': path})
    }
  };

  args = { }

  if (delay) {
    // if there's a delay, we need to check to see if the @phone param matches the current_users in the current game in the current_game_id doc in the database. If that matches, we set the setTimeout. 

    //we want to delay, THEN make our database call to check to see if the user doc phone number matches @phone param 
    setTimeout(sendSMS(args).bind({game_id: current_game_id,  }), delay);
  }
  else {
    sendSMS(args)
  }
}

//There are only three instances of delayed message sending, not including the alpha-solo game delay message sending.

//On line 214, we have an instance of a scheduleMobileCommonsOptIn which schedules the opt in for multiple phones, not just one. This may be the only instance where we are opting in moer than one player in a single function call. 

// I have 

/**
 * Schedule a message to be sent to a GROUP of users via Mobile Commons optins.
 *
 * @param alphaPhone
 *   The phone number of the alpha user. (For the purposes of this function, 
 *   it's arbitrary which phone is designated the alpha, and which phones are
 *   designated the betas. This distinction is only important because all the 
 *   beta numbers will be opted into the same distinct opt in path.) 
 *
 * @param alphaOptin
 *   The opt in path of the alpha user. 
 *
 * @param singleBetaPhoneOrArrayOfPhones
 *   Can take either a 1) a number or string representing a single beta phone
 *   or 2) an array of phones representing more than one beta phone. 
 * 
 * @param betaOptin
 *    The opt in path for ALL the beta phones. 
 */
function optinGroup(alphaPhone, alphaOptin, singleBetaPhoneOrArrayOfPhones, betaOptin) {
  if (process.env.NODE_ENV == 'test') {
    return;
  }
  var args = {
    alphaPhone: alphaPhone,
    alphaOptin: alphaOptin,
    betaOptin: betaOptin, 
    betaPhone: singleBetaPhoneOrArrayOfPhones
  }
  mobilecommons.optin(args)
}

/**
 * Schedule a message to be sent to a SINGLE user via a Mobile Commons optin.
 *
 * @param phoneNumber
 *   The phone number of the user.
 *
 * @param optinPath
 *   The opt in path of the message we want to send the user. 
 */
function optinSingleUser(phoneNumber, optinPath) {
  if (process.env.NODE_ENV == 'test') {
    return;
  }
  var args = {
    alphaPhone: phoneNumber,
    alphaOptin: optinPath
  }
  mobilecommons.optin(args);
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
 *
 * @param optinPath
 *   The opt in path of the message we're sending the user. 
 *
 * @param delay
 *   The length of time, in milliseconds, before the message is sent (or not sent, if the user has invited
 *   to another game.)
 * 
 * @param currentGameId
 *   The Mongo-generated game id of the current game we are calling this function on. 
 * 
 * @param userModel
 *   A reference to Mongoose userModel to which we're querying in order to retrieve 
 *   the specific user's user document.
 */
function delayedOptinSingleUser(phoneNumber, optinPath, delay, currentGameId, userModel) {
  if (!phoneNumber || !optinPath || !delay || !currentGameId || !userModel) {
    return;
  }

  var sendSMS = function(_phoneNumber, _optinPath, _currentGameId, _userModel) {
    _userModel.findOne({phone: _phoneNumber}, function(err, userDoc) {
      if (userDoc.current_game_id == _currentGameId) {
        mobilecommons.optin({alphaPhone: _phoneNumber, alphaOptin: _optinPath})
      }
      else {
        console.log('** User has been invited to a new game!**')
      }
    })
  }
  setTimeout(sendSMS(phoneNumber, optinPath, currentGameId, userModel), delay);
}
