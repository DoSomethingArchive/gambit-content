"use strict";

var mobilecommons = rootRequire('lib/mobilecommons');
var logger = rootRequire('lib/logger');

/**
 * CampaignBotController
 * @constructor
 */
function CampaignBotController() {};

/**
 * Chatbot endpoint for DS Campaign Signup and Reportback.
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
CampaignBotController.prototype.chatbot = function(request, response) {
  var member = request.body;
  var incomingMsg = request.body.args;
  response.send();

  var reply = '@flynn: Hi';

  mobilecommons.chatbot(member, 213849, reply);
}

module.exports = CampaignBotController;
