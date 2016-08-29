"use strict";

var mobilecommons = rootRequire('lib/mobilecommons');
var logger = rootRequire('lib/logger');

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
  var phone = request.body.phone;
  var incomingMsg = request.body.args;
  logger.debug("user:" + phone + " sent @slothbot a message:" + incomingMsg);
  response.send();

  var reply = '@slothbot: Thank you so much for talking to me. ';
  reply += 'I just sit on an office couch all day. ';
  reply += 'You just told me:\n\n' + incomingMsg;

  // @todo Move hardcoded value into environment variable.
  mobilecommons.chatbot(request.body, 210045, reply);
}

module.exports = SlothBotController;
