"use strict";

var logger = rootRequire('lib/logger');
var mobilecommons = rootRequire('lib/mobilecommons');
var phoenix = rootRequire('lib/phoenix')();

/**
 * CampaignBotController
 * @constructor
 * @param {integer} campaignId - our DS Campaign ID
 */
function CampaignBotController(campaignId) {
  this.campaignId = campaignId;
};

/**
 * Chatbot endpoint for DS Campaign Signup and Reportback.
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
CampaignBotController.prototype.chatbot = function(request, response) {
  var member = request.body;
  var incomingMsg = request.body.args;
  if (!this.campaignId) {
    response.sendStatus(422);
    return;
  }
  var context = {
    request: request,
    response: response
  };
  phoenix.campaignGet(this.campaignId, onFindCampaign.bind(context));
}

/**
 * Callback for successful loading of Campaign from Phoenix API.
 */
function onFindCampaign(err, res, body) {
  var member = this.request.body;

  var phoenixResponse = JSON.parse(body);
  var campaign = phoenixResponse.data;
  if (!campaign) {
    this.response.sendStatus(404);
    return;
  }
  this.response.send();

  var rbInfo = campaign.reportback_info;
  var msgTxt;
  if (this.request.query.start) {
    msgTxt = '@flynn: You\'re signed up for ' + campaign.title + '.\n\n';
    msgTxt += 'When completed, text back the total number of ' + rbInfo.noun;
    msgTxt += ' you have ' + rbInfo.verb + ' so far.';
  }
  else {
    var incomingMsg = this.request.body.args;
    msgTxt = '@flynn: Got you down for ' + incomingMsg;
    msgTxt += ' ' + rbInfo.noun + ' ' + rbInfo.verb + '.';
  }

  mobilecommons.chatbot(member, 213849, msgTxt);
}

module.exports = CampaignBotController;
