"use strict";

var logger = rootRequire('lib/logger');
var mobilecommons = rootRequire('lib/mobilecommons');
var phoenix = rootRequire('lib/phoenix')();
var helpers = rootRequire('lib/helpers');

var connOps = rootRequire('config/connectionOperations');
var dbReportbackSubmissions = require('../models/campaign/ReportbackSubmission')(connOps);
var dbSignups = require('../models/campaign/Signup')(connOps);
var dbUsers = require('../models/User')(connOps);

var CMD_REPORTBACK = (process.env.GAMBIT_CMD_REPORTBACK || 'P');

/**
 * CampaignBotController
 * @constructor
 * @param {integer} campaignId - our DS Campaign ID
 */
function CampaignBotController(campaignId) {

  this.campaign = app.getConfig(app.ConfigName.CAMPAIGNS, campaignId);

  var mobileCommonsCampaign = this.campaign.staging_mobilecommons_campaign;

  if (process.env.NODE_ENV === 'production') {
    mobileCommonsCampaign = this.campaign.current_mobilecommons_campaign;
  }

  var configName = app.ConfigName.CHATBOT_MOBILECOMMONS_CAMPAIGNS;
  this.mobileCommonsConfig = app.getConfig(configName, mobileCommonsCampaign);

};

/**
 * Chatbot endpoint for DS Campaign Signup and Reportback.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.chatbot = function(req, res) {
  var self = this;

  if (!self.campaign || !self.mobileCommonsConfig) {
    res.sendStatus(500);
    return;
  }

  dbUsers.findOne({ '_id': req.user_id }, function (err, userDoc) {

    if (err) {
      logger.error(err);
      return;
    }

    if (!userDoc) {
      self.createUserAndPostSignup(req, res);
      return;
    }

    self.user = userDoc;
    logger.debug('campaignBot found user:%s', self.user._id);

    var signupId = self.user.campaigns[self.campaign._id];
    if (!signupId) {
      self.postSignup(req, res);
      return;
    }

    self.loadSignup(req, res, signupId);

  });
  
}

/** 
 * Creates user and posts Signup to the Campaign.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.createUserAndPostSignup = function(req, res) {
  var self = this;

  dbUsers.create({

    _id: req.user_id,
    mobile: req.user_id,
    campaigns: {}

  }).then(function(newUserDoc) {

    self.user = newUserDoc;
    logger.debug('campaignBot created user._id:%', newUserDoc['_id']);

    self.postSignup(req, res);

  });
}

/**
 * Loads and sets a controller.signup property for given Signup Id
 * Sends chatbot response per current user's sent message and campaign progress.
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {string} signupId
 */
CampaignBotController.prototype.loadSignup = function(req, res, signupId) {
  var self = this;

  // @todo: To handle Campaign Runs, we'll need to inspect our Signup date
  // and compare to it to the Campaign's current start date. If our Signup date
  // is older than the start date, we'll need to postSignup to store the new
  // Signup ID to our user's current dbSignups in user.campaigns

  dbSignups.findOne({ '_id': signupId }, function (err, signupDoc) {

    if (err) {
      logger.error(err);
    }

    if (!signupDoc) {
      // Edge case where our cached Signup ID in user.campaigns not found
      // Could potentially lookup campaign/user in dbSignups to check for any
      // Signup document to use, but for now let's log and assume wont happen.
      logger.error('no signupDoc found for _id:%s', signupId);
      return;
    }

    self.signup = signupDoc;
    logger.debug('self.signup:%s', self.signup._id.toString());

    if (!self.supportsMMS(req, res)) {
      return;
    }

    if (self.signup.draft_reportback_submission) {
      self.continueReportbackSubmission(req, res);
      return;
    }

    var incomingCommand = helpers.getFirstWord(req.incoming_message);
    if (incomingCommand && incomingCommand.toUpperCase() === CMD_REPORTBACK) {
      self.startReportbackSubmission(req, res);
      return;
    }

    self.sendMessage(req, res, self.getCompletedMenuMsg());

  });
}

/**
 * Conversation to continue gathering data for our draft Reportback Submission.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.continueReportbackSubmission = function(req, res) {
  var self = this;

  logger.debug('continueReportbackSubmission user:%s sent:%s', req.user_id,
    req.incoming_message);

  dbReportbackSubmissions.findOne(
    { '_id': self.signup.draft_reportback_submission },
    function (err, reportbackSubmissionDoc) {

    if (err) {
      logger.error(err);
      return;
    }

    // Store reference to our draft document to save data in collect functions.
    self.reportbackSubmission = reportbackSubmissionDoc;

    var promptUser = (req.query.start || false);

    if (!self.reportbackSubmission.quantity) {
      return self.collectQuantity(req, res, promptUser);
    }

    if (!self.reportbackSubmission.image_url) {
      return self.collectPhoto(req, res, promptUser);
    }

    if (!self.reportbackSubmission.caption) {
      return self.collectCaption(req, res, promptUser);
    }

    if (!self.reportbackSubmission.why_participated) {
      return self.collectWhyParticipated(req, res, promptUser);
    }

    // @todo Could be edge case where error on submit here
    logger.warn('no messages sent from chatReportback');

  });

}

/**
 * Creates new ReportbackSubmission, saves to Signup.draft_reportback_submission
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.startReportbackSubmission = function(req, res) {
  var self = this;

  dbReportbackSubmissions.create({

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

      self.collectQuantity(req, res, true);

    });

  });

}

/**
 * Handles conversation for saving quantity to our current reportbackSubmission.
 * Creates new reportbackSubmission document if none exists.
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {boolean} promptUser - Whether to lead off conversation with user.
 */
CampaignBotController.prototype.collectQuantity = function(req, res, promptUser) {
  var self = this;

  var askQuantityMsg = self.getAskQuantityMessage();
  if (promptUser) {
    return self.sendMessage(req, res, askQuantityMsg);
  }

  var quantity = req.incoming_message;
  if (helpers.hasLetters(quantity) || !parseInt(quantity)) {
    return self.sendMessage(req, res, 'Invalid valid number sent.\n\n' + askQuantityMsg);
  }

  self.reportbackSubmission.quantity = parseInt(quantity);
  self.reportbackSubmission.save(function(e) {

    if (e) {
      return logger.error('collectQuantity error:%s', e);
    }

    self.collectPhoto(req, res, true);

  });

}

/**
 * Handles conversation for saving photo to our current reportbackSubmission.
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {boolean} promptUser
 */
CampaignBotController.prototype.collectPhoto = function(req, res, promptUser) {
  var self = this;

  var askPhotoMsg = self.getAskPhotoMessage();
  if (promptUser) {
    return self.sendMessage(req, res, askPhotoMsg);
  }

  if (!req.incoming_image_url) {
    self.sendMessage(req, res, 'No photo sent.\n\n' + askPhotoMsg);
    return;
  }

  self.reportbackSubmission.image_url = req.incoming_image_url;
  self.reportbackSubmission.save(function(e) {

    if (e) {
      return logger.error('collectCaption error:%s', e);
    }

    self.collectCaption(req, res, true);
    
  });
}

/**
 * Handles conversation for saving caption to our current reportbackSubmission.
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {boolean} promptUser
 */
CampaignBotController.prototype.collectCaption = function(req, res, promptUser) {
  var self = this;

  if (promptUser) {
    return self.sendMessage(req, res, self.getAskCaptionMessage());
  }

  self.reportbackSubmission.caption = req.incoming_message;
  self.reportbackSubmission.save(function(e) {

    if (e) {
      return logger.error('collectCaption error:%s', e);
    }

    // If this is our current user's first Reportback Submission:
    if (!self.signup.total_quantity_submitted) {

      self.collectWhyParticipated(req, res, true);
      return;

    }

    self.postReportback(req, res);
    
  });
}

/**
 * Handles conversation for saving why_participated to reportbackSubmission.
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {boolean} promptUser
 */
CampaignBotController.prototype.collectWhyParticipated = function(req, res, promptUser) {
  var self = this;

  if (promptUser) {
    return self.sendMessage(req, res, self.getAskWhyParticipatedMessage());
  }

  self.reportbackSubmission.why_participated = req.incoming_message;
  self.reportbackSubmission.save(function(e) {

    if (e) {
      return logger.error('collectWhyParticipated error:%s', e);
    }

    self.postReportback(req, res);

  });

  return;
}

/**
 * Posts a completed ReportbackSubmission to API and updates our current Signup.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.postReportback = function(req, res) {
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

      self.sendMessage(req, res, self.getCompletedMenuMsg());

    });

  });
}

/**
 * Handles conversation to save our current User's supportsMMS property.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.supportsMMS = function(req, res) {
  var self = this;

  if (self.user.supports_mms === true) {
    return true;
  }
  // @todo DRY
  // @see loadSignup()
  var incomingCommand = helpers.getFirstWord(req.incoming_message);
  if (incomingCommand && incomingCommand.toUpperCase() === CMD_REPORTBACK) {
    self.sendMessage(req, res, 'Can you send photos from your phone?');
    return false;
  }
  
  if (!helpers.isYesResponse(req.incoming_message)) {
    self.sendMessage(req, res, 'Sorry, you must submit a photo to complete.');
    return false;
  }

  self.user.supports_mms = true;
  self.user.save(function(err) {
    if (err) {
      // @todo
      // return handleError(err);
    }
    self.startReportbackSubmission(req, res);
    return true;
  });

};

/**
 * Creates a Signup for our Campaign and current User, continues conversation.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.postSignup = function(req, res) {
  logger.debug('postSignup');

  var self = this;
  var campaignId = self.campaign._id;

  // @todo Query DS API to check if Signup exists, post to API to get _id if not
  dbSignups.create({

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

      self.sendMessage(req, res, self.getStartMenuMsg());

    });

  });
}

/**
 * Bot message helper functions
 * @todo Deprecate these via Gambit Jr. CampaignBot content configs.
 */
CampaignBotController.prototype.getAskQuantityMessage = function() {
  var msgTxt = 'What`s the total number of ' + this.campaign.rb_noun;
  msgTxt += ' you ' + this.campaign.rb_verb + '?';
  msgTxt += '\n\nPlease text the exact number back.';
  return msgTxt;
}

CampaignBotController.prototype.getAskPhotoMessage = function() {
  var action = this.campaign.rb_noun + ' ' + this.campaign.rb_verb;
  var msgTxt = 'Send your best photo of you and all ';
  msgTxt += this.reportbackSubmission.quantity + ' ' + action + '.';
  return msgTxt;
}

CampaignBotController.prototype.getAskCaptionMessage = function() {
  var msgTxt = 'Text back a caption to use for your photo.';
  return msgTxt;
}

CampaignBotController.prototype.getAskWhyParticipatedMessage = function() {
  var msgTxt = 'Why did you participate in ' + this.campaign.title + '?';
  return msgTxt;
}

CampaignBotController.prototype.getStartMenuMsg = function() {
  var msgTxt = 'You\'re signed up for ' + this.campaign.title + '.\n\n';
  msgTxt += 'When you have ' + this.campaign.rb_verb + ' some ';
  msgTxt += this.campaign.rb_noun + ', text back ' + CMD_REPORTBACK.toUpperCase();
  return msgTxt;
}

CampaignBotController.prototype.getCompletedMenuMsg = function() {
  var action = this.campaign.rb_noun + ' ' + this.campaign.rb_verb;
  var msgTxt = '\n\n*' + this.campaign.title + '*\n';
  msgTxt += 'We\'ve got you down for ' + this.signup.total_quantity_submitted;
  msgTxt += ' ' + action + '.\n\n---\n';
  msgTxt += 'To add more ' + action + ', text ' + CMD_REPORTBACK.toUpperCase();
  return msgTxt;
}

/**
 * Sends mobilecommons.chatbot response with given msgTxt
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {string} msgTxt
 */
CampaignBotController.prototype.sendMessage = function(req, res, msgTxt) {

  if (req.query.start && this.signup && this.signup.draft_reportback_submission) {
    var continueMsg = 'Picking up where you left off on ' + this.campaign.title;
    msgTxt = continueMsg + '...\n\n' + msgTxt;
  }

  if (process.env.NODE_ENV !== 'production') {
    msgTxt = '@stg: ' + msgTxt;
  }

  var optInPath = this.mobileCommonsConfig.oip_chat;

  if (!optInPath) {
    logger.error("CampaignBot:%s no oip_chat found.", this.campaign._id);
    res.sendStatus(500);
    return;
  }

  mobilecommons.chatbot({phone: this.user.mobile}, optInPath, msgTxt);
  res.send();

}

module.exports = CampaignBotController;
