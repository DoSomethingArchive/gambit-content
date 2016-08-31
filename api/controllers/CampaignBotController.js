"use strict";

var logger = rootRequire('lib/logger');
var mobilecommons = rootRequire('lib/mobilecommons');
var phoenix = rootRequire('lib/phoenix')();
var helpers = rootRequire('lib/helpers');

var connOps = rootRequire('config/connectionOperations');
var reportbackSubmissions = require('../models/ReportbackSubmission')(connOps);
var users = require('../models/User')(connOps);
var START_RB_COMMAND = 'next';

/**
 * CampaignBotController
 * @constructor
 * @param {integer} campaignId - our DS Campaign ID
 */
function CampaignBotController(campaignId) {
  this.campaignId = campaignId;
  this.campaign = app.getConfig(app.ConfigName.CAMPAIGNS, campaignId);
};

/**
 * Chatbot endpoint for DS Campaign Signup and Reportback.
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
CampaignBotController.prototype.chatbot = function(request, response) {
  var self = this;
  var member = request.body;

  if (!this.campaign) {
    response.sendStatus(500);
    return;
  }
  response.send();

  users.findOne({ '_id': member.phone }, function (err, user) {

    if (err) {
      logger.error(err);
      return;
    }

    if (!user) {
      users.create({
        _id: member.phone,
        first_name: member.profile_first_name,
        mobile: member.phone
      }).then(function(newUser) {
        logger.debug('campaignBot created user._id:%', newUser['_id']);
        // @todo: Eventually need to safetycheck by querying for DS Signups API
        self.sendSignupSuccessMsg(newUser);
      });

      return;
    }

    logger.debug('campaignBot found user:%s', user._id);
    var userReplyMsg = helpers.getFirstWord(request.body.args);
    if (request.query.start || !userReplyMsg)  {
      self.sendSignupSuccessMsg(user);
      return;
    }

    if (userReplyMsg.toLowerCase() === START_RB_COMMAND) {
      self.chatReportback(user, null);
    }
    else {
      self.chatReportback(user, userReplyMsg);
    }
    
  });
  
}

CampaignBotController.prototype.chatReportback = function(user, userReplyMsg) {
  logger.verbose('reportback %s', user);
  var self = this;

  if (!user.supports_mms) {

    if (!userReplyMsg) {
      sendMessage(user, '@stg: Can you send photos from your phone?');
      return;
    }
    
    if (!helpers.isYesResponse(userReplyMsg)) {
      sendMessage(user, '@stg: Sorry, you must submit a photo to complete.');
      return;
    }

    user.supports_mms = true;
    user.save(function (err) {
      if (err) {
        return handleError(err);
      } 
      sendMessage(user, '@stg: How many nouns did you verb?');
    });
    return;


  }

  var quantity = parseInt(userReplyMsg);
  if (!quantity) {
    sendMessage(user, '@stg: Please provide a valid number.');
    return;
  }
    
  reportbackSubmissions.create({
    campaign: self.campaignId,
    mobile: user.mobile,
    quantity: quantity
  }).then(function(doc) {
    // @todo Add error handler in case of failed write
    self.sendReportbackSuccessMsg(user, quantity);
    logger.debug('campaignBot created reportbackSubmission._id:%s for:%s', 
      doc['_id'], submission);
  });

}


CampaignBotController.prototype.sendSignupSuccessMsg = function(user) {
  var msgTxt = '@stg: You\'re signed up for ' + this.campaign.title + '.\n\n';
  msgTxt += 'When you have ' + this.campaign.rb_verb + ' some ';
  msgTxt += this.campaign.rb_noun + ', text back ' + START_RB_COMMAND.toUpperCase();
  sendMessage(user, msgTxt);
}

CampaignBotController.prototype.sendReportbackSuccessMsg = function(user, quantity) {
  var msgTxt = '@stg: Got you down for ' + quantity;
  msgTxt += ' ' + this.campaign.rb_noun + ' ' + this.campaign.rb_verb + '.';
  sendMessage(user, msgTxt);
}

function sendMessage(user, msgTxt) {
  logger.debug('campaignBot.sendMessage user:%s msgTxt:%s', user, msgTxt);
  var mobileCommonsProfile = {
    phone: user._id
  };
  mobilecommons.chatbot(mobileCommonsProfile, 213849, msgTxt);
}

module.exports = CampaignBotController;
