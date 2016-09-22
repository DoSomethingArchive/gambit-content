"use strict";

const logger = rootRequire('lib/logger');
const mobilecommons = rootRequire('lib/mobilecommons');
const phoenix = rootRequire('lib/phoenix')();
const helpers = rootRequire('lib/helpers');

const connOps = rootRequire('config/connectionOperations');
const dbRbSubmissions = require('../models/campaign/ReportbackSubmission')(connOps);
const dbSignups = require('../models/campaign/Signup')(connOps);
const dbUsers = require('../models/User')(connOps);

const CMD_REPORTBACK = (process.env.GAMBIT_CMD_REPORTBACK || 'P');

/**
 * CampaignBotController
 * @constructor
 * @param {integer} campaignId - our DS Campaign ID
 */
function CampaignBotController(campaignId) {
  this.campaignId = campaignId;
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
  if (!this.bot) {
    return this.handleError(req, res, 'self.bot undefined');
  }
  if (!this.campaign) {
    return this.handleError(req, res, 'self.campaign undefined');
  }
  if (!this.mobileCommonsConfig) {
    return this.handleError(req, res, 'self.mobileCommonsConfig undefined');
  }
  // This seems like it should move into router.js (or policies dir)
  if (!req.user_id) {
    return this.handleError(req, res, 'req.user_id undefined');
  }

  this.debug(req, `incoming_message_url:${req.incoming_message}`);
  if (req.incoming_image_url) {
    this.debug(req, `incoming_message_url:${req.incoming_image_url}`);
  }

  return this.loadUserAndSignup(req, res);
}

/** 
 * Creates user and posts Signup to the Campaign.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.loadUserAndSignup = function(req, res) {
  this.debug(req, 'loadUserAndSignup');
  
  dbUsers
    .findOne({ '_id': req.user_id })
    .exec()
    .then(userDoc => {
      if (!userDoc) {
        return this.createUserAndPostSignup(req, res);
      }
      this.user = userDoc;
      this.debug(req, `loaded user:${req.user_id}`);

      const signupId = this.user.campaigns[this.campaignId];
      if (!signupId) {
        return this.postSignup(req, res);
      }
      return this.loadSignup(req, res, signupId);
    })
    .catch(err => {this.handleError(req, res, err)});
}

/** 
 * Creates user and posts Signup to the Campaign.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.createUserAndPostSignup = function(req, res) {
  this.debug(req, 'createuserAndPostSignup');

  app.locals.northstarClient.Users.get('id', req.user_id)
    .then(user => {
      const userFields = {
        _id: req.user_id,
        mobile: req.user_mobile,
        first_name: user.firstName,
        email: user.email,
        phoenix_id: user.drupalID,
        campaigns: {},   
      };
      return dbUsers.create(userFields);
    })
    .then(userDoc => {
      this.user = userDoc;
      this.debug(req, 'created userDoc');
      return this.postSignup(req, res);
    })
    .catch((err) => {self.handleError(req, res, err)});
}

/**
 * Loads and sets a controller.signup property for given Signup Id
 * Sends chatbot response per current user's sent message and campaign progress.
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {string} signupId
 */
CampaignBotController.prototype.loadSignup = function(req, res, signupId) {
  this.debug(req, 'loadSignup');

  // @todo: To handle Campaign Runs, we'll need to inspect our Signup date
  // and compare to it to the Campaign's current start date. If our Signup date
  // is older than the start date, we'll need to postSignup to store the new
  // Signup ID to our user's current dbSignups in user.campaigns

  dbSignups
    .findOne({ '_id': signupId })
    .exec()
    .then(signupDoc => {
      if (!signupDoc) {
        // Edge case where our cached Signup ID in user.campaigns not found
        // Could potentially lookup campaign/user in dbSignups to check for any
        // Signup document to use, but for now let's log and assume wont happen.
        return this.handleError(req, res, 'signupDoc not found _id:%s', signupId);
      }
      this.signup = signupDoc;
      this.debug(req, `loaded signup:${signupDoc.id}`);

      if (!this.supportsMMS(req, res)) {
        return;
      }

      if (this.signup.draft_reportback_submission) {
        return this.loadReportbackSubmission(req, res);
      }

      const incomingCommand = helpers.getFirstWord(req.incoming_message);
      if (incomingCommand && incomingCommand.toUpperCase() === CMD_REPORTBACK) {
        return this.startReportbackSubmission(req, res);
      }

      return this.sendMessage(req, res, this.bot.msg_menu_completed);

  })
  .catch(err => {this.handleError(req, res, err)});
}

/**
 * Conversation to continue gathering data for our draft Reportback Submission.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.loadReportbackSubmission = function(req, res) {
  this.debug(req, 'loadReportbackSubmission');

  const rbSubmissionId = this.signup.draft_reportback_submission;
  dbRbSubmissions
    .findOne({ '_id': rbSubmissionId })
    .exec()
    .then(reportbackSubmissionDoc => {
      this.reportbackSubmission = reportbackSubmissionDoc;
      const promptUser = (req.query.start || false);

      if (!this.reportbackSubmission.quantity) {
        return this.collectQuantity(req, res, promptUser);
      }
      if (!this.reportbackSubmission.image_url) {
        return this.collectPhoto(req, res, promptUser);
      }
      if (!this.reportbackSubmission.caption) {
        return this.collectCaption(req, res, promptUser);
      }
      if (!this.reportbackSubmission.why_participated) {
        return this.collectWhyParticipated(req, res, promptUser);
      }
      // Should have submitted in whyParticipated, but in case we're here:
      logger.warn('no messages sent from chatReportback');
      return this.postReportback(req, res);
    })
    .catch(err => {this.handleError(req, res, err)});
}

/**
 * Creates new ReportbackSubmission, saves to Signup.draft_reportback_submission
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.startReportbackSubmission = function(req, res) {
  var self = this;

  logger.debug('%s startReportbackSubmission', self.loggerPrefix(req));

  self.reportbackSubmission = new dbRbSubmissions({
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

      return self.collectQuantity(req, res, true);

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
  this.debug(req, `collectQuantity prompt:${promptUser}`);
  
  if (promptUser) {
    return this.sendMessage(req, res, this.bot.msg_ask_quantity);
  }

  const quantity = req.incoming_message;

  // @todo: Extract any numbers we can find instead of invalidating input based
  // on whether it contains any words (could contain noun, verb, or 'around 90')

  if (helpers.hasLetters(quantity) || !parseInt(quantity)) {
    return this.sendMessage(req, res, this.bot.msg_invalid_quantity);
  }

  this.reportbackSubmission.quantity = parseInt(quantity);
  return this.reportbackSubmission
    .save()
    .then(() => {
      this.debug(req, `saved quantity:${this.reportbackSubmission.quantity}`);
      return this.collectPhoto(req, res, true);
    });
}

/**
 * Handles conversation for saving photo to our current reportbackSubmission.
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {boolean} promptUser
 */
CampaignBotController.prototype.collectPhoto = function(req, res, promptUser) {
  this.debug(req, `collectPhoto prompt:${promptUser}`);

  if (promptUser) {
    return this.sendMessage(req, res, this.bot.msg_ask_photo);
  }

  if (!req.incoming_image_url) {
    return this.sendMessage(req, res, this.bot.msg_no_photo_sent);
  }

  this.reportbackSubmission.image_url = req.incoming_image_url;
  return this.reportbackSubmission
    .save()
    .then(() => {
      this.debug(req, `saved image_url:${this.reportbackSubmission.image_url}`);
      return this.collectCaption(req, res, true);
    });
}

/**
 * Handles conversation for saving caption to our current reportbackSubmission.
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {boolean} promptUser
 */
CampaignBotController.prototype.collectCaption = function(req, res, promptUser) {
  this.debug(req, `collectCaption prompt:${promptUser}`);

  if (promptUser) {
    return this.sendMessage(req, res, this.bot.msg_ask_caption);
  }

  this.reportbackSubmission.caption = req.incoming_message;
  return this.reportbackSubmission
    .save()
    .then(() => {
      this.debug(req, `saved caption:${this.reportbackSubmission.caption}`);
      // If this is our current user's first Reportback Submission:
      if (!this.signup.total_quantity_submitted) {
        return this.collectWhyParticipated(req, res, true);
      }
      return this.postReportback(req, res);    
  });
}

/**
 * Handles conversation for saving why_participated to reportbackSubmission.
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {boolean} promptUser
 */
CampaignBotController.prototype.collectWhyParticipated = function(req, res, promptUser) {
  this.debug(req, `collectWhyParticipated prompt:${promptUser}`);

  if (promptUser) {
    return this.sendMessage(req, res, this.bot.msg_ask_why_participated);
  }

  this.reportbackSubmission.why_participated = req.incoming_message;
  return this.reportbackSubmission
    .save()
    .then(() => {
      this.debug(req, `saved why_participated:${req.incoming_message}`);
      return this.postReportback(req, res);
  });
}

/**
 * Posts a completed ReportbackSubmission to API and updates our current Signup.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
CampaignBotController.prototype.postReportback = function(req, res) {
  this.debug(req, 'postReportback');

  const dateSubmitted = Date.now();
  // @todo Post Reportback to DS API

  this.reportbackSubmission.submitted_at = dateSubmitted;
  return this.reportbackSubmission
    .save()
    .then(() => {
      this.debug(req, `saved submitted_at:${dateSubmitted}`);
      this.signup.total_quantity_submitted = this.reportbackSubmission.quantity;
      this.signup.updated_at = dateSubmitted;
      this.signup.draft_reportback_submission = undefined;
      return this.signup
        .save()
        .then(() => {
          this.debug(req, `saved total_quantity_submitted:${this.signup.total_quantity_submitted}`);
          return this.sendMessage(req, res, this.bot.msg_menu_completed);
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
  const self = this;
  this.debug(req, 'postSignup');

  // @todo Query DS API to check if Signup exists, post to API to get _id if not

  dbSignups
    .create({
      campaign: this.campaignId,
      user: req.user_id,
    })
    .then(signupDoc => {
      const signupId = signupDoc._id;
      this.debug(req, `created signupDoc:${signupId}`)
      // Store as the User's current Signup for this Campaign.
      this.user.campaigns[this.campaignId] = signupId;
      this.user.markModified('campaigns');
      this.user.save(err => {
        if (err) {
          return self.handleError(err);
        }
        return self.sendMessage(req, res, self.bot.msg_menu_signedup);
      });
    })
    .catch((err) => {self.handleError(req, res, err)});
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
  return 'campaignBot.campaign:' + this.campaignId + ' user:' + req.user_id;
}

/**
 * Calls logger with CampaignBot prefix
 * @param {object} req - Express request
 * @return {string}
 */
CampaignBotController.prototype.debug = function(req, debugMsg) {
  logger.debug(`${this.loggerPrefix(req)} ${debugMsg}`);
}

module.exports = CampaignBotController;
