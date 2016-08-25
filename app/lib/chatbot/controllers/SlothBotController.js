"use strict";

var mobilecommons = rootRequire('mobilecommons');
var smsHelper = rootRequire('app/lib/smsHelpers');
var logger = rootRequire('app/lib/logger');

/**
 * SlothBotController
 * @constructor
 */
function SlothBotController() {};

/**
 * Welcome to season 2!
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
SlothBotController.prototype.chatbot = function(request, response) {
  console.log(request.body);

  var phone = smsHelper.getNormalizedPhone(request.body.phone);
  logger.debug("user:" + phone + " sent @slothbot a message:" + request.body.args);
  response.send();  
  var mobileCommonsCustomFields = {
    slothbot_response: request.body.args
  };
  // @todo Move hardcoded value into environment variable.
  mobilecommons.profile_update(phone, 210045, mobileCommonsCustomFields); 
}

module.exports = SlothBotController;
