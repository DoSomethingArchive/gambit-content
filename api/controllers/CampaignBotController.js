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
  this.campaign = app.getConfig(app.ConfigName.CAMPAIGNS, campaignId);
};

/**
 * Chatbot endpoint for DS Campaign Signup and Reportback.
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
CampaignBotController.prototype.chatbot = function(request, response) {
  var self = this;

  if (!self.campaign) {
    response.sendStatus(500);
    return;
  }
  response.send();

  // Load our current user document (creates first if document not found).
  users.findOne({ '_id': request.user_id }, function (err, user) {

    if (err) {
      logger.error(err);
      return;
    }

    if (!user) {

      users.create({

        _id: request.user_id,
        mobile: request.user_id

      }).then(function(newUser) {

        self.user = newUser;
        logger.debug('campaignBot created user._id:%', newUser['_id']);

        // Assuming our user hasn't signed up on web first for now.
        // @todo: Eventually need to safetycheck by querying for DS Signups API
        self.sendSignupSuccessMsg();

      });

      return;
    }

    self.user = user;
    logger.debug('campaignBot found user:%s', self.user._id);

    self.incomingMsg = request.incoming_message;

    if (request.query.start || !self.incomingMsg)  {
      self.sendSignupSuccessMsg();
      return;
    }

    self.chatReportback();  
  });
  
}

CampaignBotController.prototype.chatReportback = function() {
  var self = this;

  if (!self.supportsMMS()) {
    return;
  }

  var quantity = parseInt(self.incomingMsg);
  if (!quantity) {
    self.sendMessage('@stg: Please provide a valid number.');
    return;
  }
    
  reportbackSubmissions.create({

    campaign: self.campaign._id,
    mobile: self.user.mobile,
    quantity: quantity

  }).then(function(reportbackSubmission) {

    // @todo Add error handler in case of failed write
    self.sendReportbackSuccessMsg(quantity);
    logger.debug('campaignBot created reportbackSubmission._id:%s', 
      reportbackSubmission['_id']);

  });

}

CampaignBotController.prototype.supportsMMS = function() {
  var self = this;

  if (self.user.supports_mms) {
    return true;
  }

  if (!self.incomingMsg) {
    self.sendMessage('@stg: Can you send photos from your phone?');
    return false;
  }
  
  if (!helpers.isYesResponse(self.incomingMsg)) {
    self.sendMessage('@stg: Sorry, you must submit a photo to complete.');
    return false;
  }

  self.user.supports_mms = true;
  self.user.save(function(err) {
    if (err) {
      // @todo
      // return handleError(err);
    }
    self.askQuantity();
    return true;
  });

};

CampaignBotController.prototype.askQuantity = function() {
  var msgTxt = '@stg: how many ' + this.campaign.rb_noun + ' have you ';
  msgTxt += this.campaign.rb_verb + '?\n\nPls txt the exact number.';
  this.sendMessage(msgTxt);
}


CampaignBotController.prototype.sendSignupSuccessMsg = function() {
  var msgTxt = '@stg: You\'re signed up for ' + this.campaign.title + '.\n\n';
  msgTxt += 'When you have ' + this.campaign.rb_verb + ' some ';
  msgTxt += this.campaign.rb_noun + ', text back ' + START_RB_COMMAND.toUpperCase();
  this.sendMessage(msgTxt);
}

CampaignBotController.prototype.sendReportbackSuccessMsg = function(quantity) {
  var msgTxt = '@stg: Got you down for ' + quantity;
  msgTxt += ' ' + this.campaign.rb_noun + ' ' + this.campaign.rb_verb + '.';
  this.sendMessage(msgTxt);
}

CampaignBotController.prototype.sendMessage = function(msgTxt) {
  logger.debug('campaignBot.sendMessage user:%s msgTxt:%s', this.user, msgTxt);
  var mobileCommonsProfile = {
    phone: this.user.mobile
  };
  mobilecommons.chatbot(mobileCommonsProfile, 213849, msgTxt);
}

module.exports = CampaignBotController;
