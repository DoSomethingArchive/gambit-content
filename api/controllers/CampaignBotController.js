"use strict";

var logger = rootRequire('lib/logger');
var mobilecommons = rootRequire('lib/mobilecommons');
var phoenix = rootRequire('lib/phoenix')();

var connOps = rootRequire('config/connectionOperations');
var reportbackSubmissions = require('../models/ReportbackSubmission')(connOps);
var users = require('../models/User')(connOps);

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
  var self = this;
  var member = request.body;

  if (!this.campaignId) {
    response.sendStatus(422);
    return;
  }

  users.findOne({ '_id': member.phone }, function (err, userDoc) {

    if (err) {
      logger.error(err);
      return;
    }

    if (!userDoc) {
      users.create({
        _id: member.phone,
        first_name: member.profile_first_name,
        mobile: member.phone
      }).then(function(doc) {
        logger.debug('campaignBot created user._id:%', doc['_id']);
      });
    }

    else {
      logger.debug('campaignBot found user:%s', userDoc._id);
    }

  });

  var context = {
    request: request,
    response: response
  };
  phoenix.campaignGet(this.campaignId, self.onFindCampaign.bind(context));
}

/**
 * Callback for successful loading of Campaign from Phoenix API.
 */
CampaignBotController.prototype.onFindCampaign = function(err, res, body) {
  var member = this.request.body;

  var phoenixResponse = JSON.parse(body);
  var campaign = phoenixResponse.data;
  if (!campaign) {
    this.response.sendStatus(404);
    return;
  }
  this.response.send();


  var msgTxt;
  if (this.request.query.start || !this.request.body.args) {
    msgTxt = getSignupConfirmMessage(campaign);
  }
  else {
    var quantity = parseInt(this.request.body.args);
    msgTxt = getReportbackConfirmMessage(campaign, quantity);

    reportbackSubmissions.create({
      campaign: parseInt(campaign.id),
      mobile: member.phone,
      quantity: quantity
    }).then(function(doc) {
      logger.debug('campaignBot created reportbackSubmission._id:%s for:%s', 
        doc['_id'], submission);
    });
  }
  sendMessage(member, msgTxt);
}


function getSignupConfirmMessage(campaign) {
  var rbInfo = campaign.reportback_info;
  var msgTxt = '@stg: You\'re signed up for ' + campaign.title + '.\n\n';
  msgTxt += 'When completed, text back the total number of ' + rbInfo.noun;
  msgTxt += ' you have ' + rbInfo.verb + ' so far.';
  return msgTxt;
}

function getReportbackConfirmMessage(campaign, quantity) {
  var rbInfo = campaign.reportback_info;
  var msgTxt = '@stg: Got you down for ' + quantity;
  msgTxt += ' ' + rbInfo.noun + ' ' + rbInfo.verb + '.';
  return msgTxt;
}

function sendMessage(mobileCommonsProfile, msgTxt) {
  mobilecommons.chatbot(mobileCommonsProfile, 213849, msgTxt);
}

module.exports = CampaignBotController;
