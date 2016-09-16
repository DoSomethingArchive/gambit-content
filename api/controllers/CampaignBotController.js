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
  if (!this.campaign) {
    return;
  }

  // @todo Config variable for default CampaignBot ID
  // @todo Store campaignbot property on our config.campaigns to override bot
  // on a per DS Campaign basis.
  this.bot = app.getConfig(app.ConfigName.CAMPAIGNBOTS, 41);

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

  if (!self.bot) {
    return self.handleError(req, res, 'self.bot undefined');
  }
  if (!self.campaign) {
    return self.handleError(req, res, 'self.campaign undefined');
  }
  if (!self.mobileCommonsConfig) {
    return self.handleError(req, res, 'self.mobileCommonsConfig undefined');
  }

  // This seems like it should move into router.js (or policies dir)
  if (!req.user_id) {
    return self.handleError(req, res, 'req.user_id undefined');
  }

  logger.debug('%s incoming_message:%s', this.loggerPrefix(req),
    req.incoming_message);
  if (req.incoming_image_url) {
    logger.debug('%s incoming_image_url:%s', this.loggerPrefix(req),
      req.incoming_image_url);
  }

  dbUsers.findOne({ '_id': req.user_id }, function (err, userDoc) {

    if (err) {
      return self.handleError(req, res, err);
    }

    if (!userDoc) {
      self.createUserAndPostSignup(req, res);
      return;
    }

    self.user = userDoc;
    logger.debug('%s loaded user:%s', self.loggerPrefix(req), self.user._id);

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

  var newUser = {
    _id: req.user_id,
    mobile: req.user_mobile,
    campaigns: {}
  };

  dbUsers.create(newUser, function (err, userDoc) {

    if (err) {
      return self.handleError(req, res, err);
    }

    self.user = userDoc;
    logger.debug('%s created user', self.loggerPrefix(req));

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
      return self.handleError(req, res, err);
    }

    if (!signupDoc) {
      // Edge case where our cached Signup ID in user.campaigns not found
      // Could potentially lookup campaign/user in dbSignups to check for any
      // Signup document to use, but for now let's log and assume wont happen.
      return this.handleError(req, res, 'signupDoc not found _id:%s', signupId);
    }

    self.signup = signupDoc;
    logger.debug('%s loaded signup:%s', self.loggerPrefix(req),
      self.signup._id.toString());

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

    self.sendMessage(req, res, self.bot.msg_menu_completed);

  });
}

/**
 * Conversation to continue gathering data for our draft Reportback Submission.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.continueReportbackSubmission = function(req, res) {
  var self = this;

  logger.debug('%s continueReportbackSubmission', self.loggerPrefix(req));

  dbReportbackSubmissions.findOne(
    { '_id': self.signup.draft_reportback_submission },
    function (err, reportbackSubmissionDoc) {

    if (err) {
      return self.handleError(req, res, err);
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

  logger.debug('%s startReportbackSubmission', self.loggerPrefix(req));

  self.reportbackSubmission = new dbReportbackSubmissions({
    campaign: self.campaign._id,
    user: self.user._id 
  });

  self.reportbackSubmission.save(function (err) {

    if (err) {
      return self.handleError(err);
    }

    var draftId = self.reportbackSubmission._id.toString()

    // Store to our signup for easy lookup by ID in future requests.
    self.signup.draft_reportback_submission = draftId;

    logger.debug('%s created reportbackSubmission:%s', self.loggerPrefix(req),
       self.signup.draft_reportback_submission);

    self.signup.save(function (e) {

      if (e) {
        return self.handleError(req, res, e);
      }

      logger.debug('%s saved signup:%s', self.loggerPrefix(req),
        self.signup._id.toString());

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

  if (promptUser) {
    return self.sendMessage(req, res, self.bot.msg_ask_quantity);
  }

  var quantity = req.incoming_message;

  // @todo: Extract any numbers we can find instead of invalidating input based
  // on whether it contains any words (could contain noun, verb, or 'around 90')

  if (helpers.hasLetters(quantity) || !parseInt(quantity)) {
    return self.sendMessage(req, res, self.bot.msg_invalid_quantity);
  }

  self.reportbackSubmission.quantity = parseInt(quantity);

  self.reportbackSubmission.save(function (e) {

    if (e) {
      return self.handleError(req, res, e);
    }
    
    logger.debug('%s saved quantity:%s', self.loggerPrefix(req),
        self.reportbackSubmission.quantity);

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

  if (promptUser) {
    return self.sendMessage(req, res, self.bot.msg_ask_photo);
  }

  if (!req.incoming_image_url) {
    self.sendMessage(req, res, self.bot.msg_no_photo_sent);
    return;
  }

  self.reportbackSubmission.image_url = req.incoming_image_url;

  self.reportbackSubmission.save(function (e) {

    if (e) {
      return self.handleError(req, res, e);
    }

    logger.debug('%s saved image_url:%s', self.loggerPrefix(req),
        self.reportbackSubmission.image_url);

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
    return self.sendMessage(req, res, self.bot.msg_ask_caption);
  }

  self.reportbackSubmission.caption = req.incoming_message;

  self.reportbackSubmission.save(function (e) {

    if (e) {
      return self.handleError(req, res, e);
    }

    logger.debug('%s saved caption:%s', self.loggerPrefix(req),
        self.reportbackSubmission.caption);

    // If this is our current user's first Reportback Submission:
    if (!self.signup.total_quantity_submitted) {
      return self.collectWhyParticipated(req, res, true);
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
    return self.sendMessage(req, res, self.bot.msg_get_why_participated);
  }

  self.reportbackSubmission.why_participated = req.incoming_message;

  self.reportbackSubmission.save(function (e) {

    if (e) {
      return self.handleError(req, res, e);
    }

    logger.debug('%s saved why_participated:%s', self.loggerPrefix(req),
        self.reportbackSubmission.why_participated);

    self.postReportback(req, res);

  });

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

  self.reportbackSubmission.save(function (e) {

    if (e) {
      return self.handleError(req, res, e);
    }

    // @todo Post to DS API
    logger.debug('%s saved submitted_at:%s', self.loggerPrefix(req),
      dateSubmitted);

    self.signup.total_quantity_submitted = self.reportbackSubmission.quantity;
    self.signup.updated_at = dateSubmitted;
    self.signup.draft_reportback_submission = undefined;

    self.signup.save(function (signupErr) {

      if (signupErr) {
        return self.handleError(req, res, signupErr);
      }

      logger.debug('%s saved total_quantity_submitted:%s', self.loggerPrefix(req),
        self.signup.total_quantity_submitted);

      self.sendMessage(req, res, self.bot.msg_menu_completed);

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
  // @todo DRY this logic.
  // @see loadSignup()
  var incomingCommand = helpers.getFirstWord(req.incoming_message);
  if (incomingCommand && incomingCommand.toUpperCase() === CMD_REPORTBACK) {
    self.sendMessage(req, res, self.bot.msg_ask_supports_mms);
    return false;
  }
  
  if (!helpers.isYesResponse(req.incoming_message)) {
    self.sendMessage(req, res, self.bot.msg_no_supports_mms);
    return false;
  }

  self.user.supports_mms = true;

  self.user.save(function (err) {

    if (err) {
      return self.handleError(err);
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
  var self = this;

  logger.debug('%s postSignup', self.loggerPrefix(req));
  var campaignId = self.campaign._id;

  // @todo Query DS API to check if Signup exists, post to API to get _id if not
  dbSignups.create({

    campaign: campaignId,
    user: self.user._id

  }, function (err, signupDoc) {

    if (err) {
      return self.handleError(req, res, err);
    }

    // Store as the User's current Signup for this Campaign.
    self.user.campaigns[campaignId] = signupDoc._id;
    self.user.markModified('campaigns');

    self.user.save(function (e) {

      if (err) {
        self.handleError(e);
      }

      self.sendMessage(req, res, self.bot.msg_menu_signedup);

    });

  });
}

/**
 * Sends mobilecommons.chatbot response with given msgTxt
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {string} msgTxt
 */
CampaignBotController.prototype.sendMessage = function(req, res, msgTxt) {
  if (!msgTxt) {
    return this.handleError(req, res, 'sendMessage no msgTxt');
  }

  msgTxt = msgTxt.replace(/<br>/gi, '\n');
  msgTxt = msgTxt.replace(/{{title}}/gi, this.campaign.title);
  msgTxt = msgTxt.replace(/{{rb_noun}}/gi, this.campaign.rb_noun);
  msgTxt = msgTxt.replace(/{{rb_verb}}/gi, this.campaign.rb_verb);

  if (this.signup) {
    var quantity = this.signup.total_quantity_submitted
    // If a draft exists, use the reported draft from draft, as we're continuing
    // the ReportbackSubmission.
    if (this.reportbackSubmission) {
      quantity = this.reportbackSubmission.quantity;
    }
    msgTxt = msgTxt.replace(/{{quantity}}/gi, quantity);
  }

  if (req.query.start && this.signup && this.signup.draft_reportback_submission) {
    // @todo New bot property for continue draft message
    var continueMsg = 'Picking up where you left off on ' + this.campaign.title;
    msgTxt = continueMsg + '...\n\n' + msgTxt;
  }

  if (process.env.NODE_ENV !== 'production') {
    msgTxt = '@stg: ' + msgTxt;
  }

  var optInPath = this.mobileCommonsConfig.oip_chat;

  if (!optInPath) {
    return this.handleError(req, res);
  }

  mobilecommons.chatbot({phone: this.user.mobile}, optInPath, msgTxt);
  res.send();

}

/**
 * Sends 500 error back for given error
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {object} error
 */
CampaignBotController.prototype.handleError = function(req, res, error) {

  var campaignId = null;
  if (this.campaign) {
    campaignId = this.campaign._id;
  }

  if (error) {
    logger.error('%s handleError:' + error, this.loggerPrefix(req));
  }
  
  return res.sendStatus(500);

}

/**
 * Sends CampaignBot prefix to use in logger messages
 * @param {object} req - Express request
 * @return {string}
 */
CampaignBotController.prototype.loggerPrefix = function(req) {
  return 'campaignBot.campaign:' + req.query.campaign + ' user:' + req.user_id;
}

module.exports = CampaignBotController;
