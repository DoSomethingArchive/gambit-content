"use strict";

var logger = rootRequire('lib/logger');
var mobilecommons = rootRequire('lib/mobilecommons');
var phoenix = rootRequire('lib/phoenix')();
var helpers = rootRequire('lib/helpers');

var connOps = rootRequire('config/connectionOperations');
var reportbackSubmissions = require('../models/campaign/ReportbackSubmission')(connOps);
var signups = require('../models/campaign/Signup')(connOps);
var users = require('../models/User')(connOps);

var CMD_REPORTBACK = (process.env.GAMBIT_CMD_REPORTBACK || 'p');

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

  // @todo: Move into the completion handlers by passing into functions.
  response.send();

  users.findOne({ '_id': request.user_id }, function (err, userDoc) {

    if (err) {
      logger.error(err);
      return;
    }

    if (!userDoc) {
      self.createUserAndPostSignup(request, response);
      return;
    }

    self.user = userDoc;
    logger.debug('campaignBot found user:%s', self.user._id);

    if (request.incoming_message) {
      self.incomingMsg = request.incoming_message.toLowerCase();
    }

    var signupId = self.user.campaigns[self.campaign._id];
    if (!signupId) {
      self.postSignup();
      return;
    }

    self.loadSignup(signupId);

  });
  
}

/** 
 * Creates user and posts Signup to the Campaign.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.createUserAndPostSignup = function(req, res) {
  var self = this;

  users.create({

    _id: req.user_id,
    mobile: req.user_id,
    campaigns: {}

  }).then(function(newUser) {

    self.user = newUser;
    logger.debug('campaignBot created user._id:%', newUser['_id']);

    self.postSignup();

  });
}

/**
 * Loads and sets a controller.signup property for given Signup Id
 * Sends chatbot response per current user's sent message and campaign progress.
 * @param {string} signupId
 */
CampaignBotController.prototype.loadSignup = function(signupId) {
  var self = this;

  // @todo: To handle Campaign Runs, we'll need to inspect our Signup date
  // and compare to it to the Campaign's current start date. If our Signup date
  // is older than the start date, we'll need to postSignup to store the new
  // Signup ID to our user's current Signups in user.campaigns

  signups.findOne({ '_id': signupId }, function (err, signupDoc) {

    if (err) {
      logger.error(err);
    }

    if (!signupDoc) {
      // Edge case where our cached Signup ID in user.campaigns not found
      // Could potentially lookup campaign/user in Signups to check for any
      // Signup document to use, but for now let's log and assume wont happen.
      logger.error('no signupDoc found for _id:%s', signupId);
      return;
    }

    self.signup = signupDoc;
    logger.debug('self.signup:%s', self.signup._id.toString());

    if (!self.supportsMMS()) {
      return;
    }

    if (self.signup.draft_reportback_submission) {
      self.continueReportbackSubmission();
      return;
    }

    if (self.incomingMsg === CMD_REPORTBACK) {
      self.startReportbackSubmission();
      return;
    }

    self.sendCompletedMenuMsg();

  });
}

/**
 * Conversation to continue gathering data for our draft Reportback Submission.
 */
CampaignBotController.prototype.continueReportbackSubmission = function() {
  var self = this;

  reportbackSubmissions.findOne(
    { '_id': self.signup.draft_reportback_submission },
    function (err, reportbackSubmissionDoc) {

    if (err) {
      logger.error(err);
      return;
    }

    // @todo: Inspect our incoming message to determine if User is attemping
    // continue Campaign conversation by texting in the Campaign Signup keyword

    // Store reference to our draft document to save data in collect functions.
    self.reportbackSubmission = reportbackSubmissionDoc;

    if (!self.reportbackSubmission.quantity) {
      self.collectQuantity();
      return;
    }

    if (!self.reportbackSubmission.why_participated) {
      self.collectWhyParticipated();
      return;
    }

    // @todo Could be edge case where error on submit here
    logger.warn('no messages sent from chatReportback');

  });

}

/**
 * Creates new ReportbackSubmission, saves to Signup.draft_reportback_submission
 */
CampaignBotController.prototype.startReportbackSubmission = function() {
  var self = this;

  reportbackSubmissions.create({

    campaign: self.campaign._id,
    user: self.user._id,

  }).then(function(reportbackSubmission) {

    // @todo this is firing when not expecting it to, commented for now.
    // if (err) {
    //   return logger.error('reportbackSubmission.create error:%s', err);
    // }

    logger.debug('campaignBot created reportbackSubmission._id:%s', 
      reportbackSubmission['_id']);

    // Store to our signup for easy lookup in future requests.
    self.signup.draft_reportback_submission = reportbackSubmission._id.toString();
    self.signup.save(function(e) {

      if (e) {
        return logger.error('signup.save error:%s', e);
      }

      logger.debug('campaignBot saved reportbackSubmission:%s to signup:%s', 
        self.signup.draft_reportback_submission, self.signup._id);

      self.reportbackSubmission = reportbackSubmission;

      self.collectQuantity(true);

    });

  });

}

/**
 * Handles conversation for saving quantity to our current reportbackSubmission.
 * Creates new reportbackSubmission document if none exists.
 * @param {boolean} promptUser - Whether to lead off conversation with user.
 */
CampaignBotController.prototype.collectQuantity = function(promptUser) {
  var self = this;

  if (promptUser) {
    self.sendAskQuantityMessage();
    return;
  }

  var quantity = self.incomingMsg;
  if (helpers.hasLetters(quantity) || !parseInt(quantity)) {
    self.sendMessage('@stg: Please provide a valid number.');
    return;
  }

  self.reportbackSubmission.quantity = parseInt(quantity);
  self.reportbackSubmission.save(function(e) {

    if (e) {
      return logger.error('collectQuantity error:%s', e);
    }

    self.collectWhyParticipated(true);

  });

}

/**
 * Handles conversation for saving why_participated to reportbackSubmission.
 * @param {boolean} promptUser - Whether to lead off conversation with user.
 */
CampaignBotController.prototype.collectWhyParticipated = function(promptUser) {
  var self = this;

  if (promptUser) {
    self.sendAskWhyParticipatedMessage();
    return;
  }

  self.reportbackSubmission.why_participated = self.incomingMsg;
  self.reportbackSubmission.save(function(e) {

    if (e) {
      return logger.error('collectWhyParticipated error:%s', e);
    }

    self.postReportback();

  });

  return;
}

/**
 * Posts a completed ReportbackSubmission to API and updates our current Signup.
 */
CampaignBotController.prototype.postReportback = function() {
  var self = this;

  var dateSubmitted = Date.now();
  self.reportbackSubmission.submitted_at = dateSubmitted;

  self.reportbackSubmission.save(function(e) {

    if (e) {
      return logger.error('whyParticipated error:%s', e);
    }

    // @todo Post to DS API

    self.signup.total_quantity_submitted = self.reportbackSubmission.quantity;
    self.signup.updated_at = dateSubmitted;
    self.signup.draft_reportback_submission = undefined;

    self.signup.save(function(signupErr) {

      self.sendCompletedMenuMsg();

    });

  });
}

/**
 * Handles conversation to save our current User's supportsMMS property.
 */
CampaignBotController.prototype.supportsMMS = function() {
  var self = this;

  if (self.user.supports_mms === true) {
    return true;
  }

  if (self.incomingMsg === CMD_REPORTBACK || !self.incomingMsg) {
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
    self.startReportbackSubmission();
    return true;
  });

};

/**
 * Creates a Signup for our Campaign and current User, continues conversation.
 */
CampaignBotController.prototype.postSignup = function() {
  logger.debug('postSignup');

  var self = this;
  var campaignId = self.campaign._id;

  // @todo Query DS API to check if Signup exists, post to API to get _id if not
  signups.create({

    campaign: campaignId,
    user: self.user._id

  }).then(function(signupDoc) {

    // Store as the User's current Signup for this Campaign.
    self.user.campaigns[campaignId] = signupDoc._id;
    self.user.markModified('campaigns');

    self.user.save(function(err) {

      if (err) {
        logger.error(err);
      }

      self.sendStartMenuMsg();

    });

  });
}

/**
 * Bot message helper functions
 * @todo Deprecate these via Gambit Jr. CampaignBot content configs.
 */
CampaignBotController.prototype.sendAskQuantityMessage = function() {
  var msgTxt = '@stg: What`s the total number of ' + this.campaign.rb_noun;
  msgTxt += ' you ' + this.campaign.rb_verb + '?';
  msgTxt += '\n\nPlease text the exact number back.';
  this.sendMessage(msgTxt);
}

CampaignBotController.prototype.sendAskWhyParticipatedMessage = function() {
  var msgTxt = '@stg: Why did you participate in ' + this.campaign.title + '?';
  this.sendMessage(msgTxt);
}

// We need a start menu to first check whether member can send photos
// (as opposed to immediately asking for quantity after Signup creation)
CampaignBotController.prototype.sendStartMenuMsg = function() {
  var msgTxt = '@stg: You\'re signed up for ' + this.campaign.title + '.\n\n';
  msgTxt += 'When you have ' + this.campaign.rb_verb + ' some ';
  msgTxt += this.campaign.rb_noun + ', text back ' + CMD_REPORTBACK.toUpperCase();
  this.sendMessage(msgTxt);
}

CampaignBotController.prototype.sendCompletedMenuMsg = function() {
  var action = this.campaign.rb_noun + ' ' + this.campaign.rb_verb;
  var msgTxt = '@stg:\n\n*' + this.campaign.title + '*\n';
  msgTxt += 'We\'ve got you down for ' + this.signup.total_quantity_submitted;
  msgTxt += ' ' + action + '.\n\n---\n';
  msgTxt += 'To add more ' + action + ', text ' + CMD_REPORTBACK.toUpperCase();
  this.sendMessage(msgTxt);
}

CampaignBotController.prototype.sendMessage = function(msgTxt) {
  var mobileCommonsProfile = {
    phone: this.user.mobile
  };
  mobilecommons.chatbot(mobileCommonsProfile, 213849, msgTxt);
}

module.exports = CampaignBotController;
