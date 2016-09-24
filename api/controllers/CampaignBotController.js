"use strict";

/**
 * Imports.
 */
const logger = rootRequire('lib/logger');
const mobilecommons = rootRequire('lib/mobilecommons');
const phoenix = rootRequire('lib/phoenix')();
const helpers = rootRequire('lib/helpers');
const connOps = rootRequire('config/connectionOperations');
const dbRbSubmissions = require('../models/campaign/ReportbackSubmission')(connOps);
const dbSignups = require('../models/campaign/Signup')(connOps);
const dbUsers = require('../models/User')(connOps);

/**
 * Setup.
 */
const CMD_REPORTBACK = (process.env.GAMBIT_CMD_REPORTBACK || 'P');

/**
 * CampaignBotController.
 */
class CampaignBotController {

  constructor(req, res) {
    this.debug(req, `incoming_message_url:${req.incoming_message}`);
    if (req.incoming_image_url) {
      this.debug(req, `incoming_message_url:${req.incoming_image_url}`);
    }

    this.campaignId = req.query.campaign;
    this.campaign = app.getConfig(app.ConfigName.CAMPAIGNS, this.campaignId);
    if (!this.campaign) {
      return this.error(req, res, 'campaign config not found');;
    }

    // @todo Config variable for default CampaignBot ID
    // @todo Store campaignbot property on our config.campaigns to override bot
    // on a per DS Campaign basis.
    this.bot = app.getConfig(app.ConfigName.CAMPAIGNBOTS, 41);
    if (!this.bot) {
      return this.error(req, res, 'bot config not found');
    }

    let mobileCommonsCampaign = this.campaign.staging_mobilecommons_campaign;
    if (process.env.NODE_ENV === 'production') {
      mobileCommonsCampaign = this.campaign.current_mobilecommons_campaign;
    }
    const configName = app.ConfigName.CHATBOT_MOBILECOMMONS_CAMPAIGNS;
    this.mobileCommonsConfig = app.getConfig(configName, mobileCommonsCampaign);
    if (!this.mobileCommonsConfig) {
      return this.error(req, res, 'mobileCommonsConfig not found');
    }

    // This seems like it should move into router.js (or policies dir)
    if (!req.user_id) {
      return this.error(req, res, 'chatbot.req.user_id undefined');
    }

    return this.loadUserAndSignup(req, res);
  }

  collectCaption(req, res, promptUser) {
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

  collectPhoto(req, res, promptUser) {
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

  collectQuantity(req, res, promptUser) {
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

  collectWhyParticipated(req, res, promptUser) {
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

  createReportbackSubmission(req, res) {
    this.debug(req, 'createReportbackSubmission');

    this.reportbackSubmission = new dbRbSubmissions({
      campaign: this.campaignId,
      user: req.user_id, 
    });

    return this.reportbackSubmission
      .save()
      .then(rbSubmissionDoc => {
        const draftId = rbSubmissionDoc._id.toString();
        // Store to our signup for easy lookup by ID in future requests.
        this.signup.draft_reportback_submission = draftId;
        this.debug(req, `created reportbackSubmission:${draftId}`);
        
        return this.signup.save();
      })
      .then(() => {
        this.debug(req, `saved signup:${this.signup._id.toString()}`);

        return this.collectQuantity(req, res, true);
      });
  }

  createUserAndPostSignup(req, res) {
    this.debug(req, 'createuserAndPostSignup');

    return app.locals.northstarClient.Users.get('id', req.user_id)
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
      });
  }

  debug(req, debugMsg) {
    logger.debug(`${this.loggerPrefix(req)} ${debugMsg}`);
  }

  error(req, res, errorMsg) {
    logger.error(`${this.loggerPrefix(req)} ${errorMsg}`);

    return res.sendStatus(500);
  }

  loadReportbackSubmission(req, res) {
    this.debug(req, 'loadReportbackSubmission');

    return dbRbSubmissions
      .findById(this.signup.draft_reportback_submission)
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
        // Should have submitted in whyParticipated, but in case of failed_at:
        logger.warn('no messages sent from chatReportback');

        return this.postReportback(req, res);
      });
  }

  loadSignup(req, res, signupId) {
    this.debug(req, 'loadSignup');

    // @todo: To handle Campaign Runs, we'll need to inspect our Signup date
    // and compare to it to the Campaign's current start date. If our Signup date
    // is older than the start date, we'll need to postSignup to store the new
    // Signup ID to our user's current dbSignups in user.campaigns
    return dbSignups
      .findById(signupId)
      .exec()
      .then(signupDoc => {
        if (!signupDoc) {
          // Edge case where our cached Signup ID in user.campaigns not found
          // Could potentially lookup campaign/user in dbSignups to check for any
          // Signup document to use, but for now let's log and assume wont happen.
          return this.error(req, res, 'loadSignup no doc _id:%s', signupId);
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
          return this.createReportbackSubmission(req, res);
        }

        return this.sendMessage(req, res, this.bot.msg_menu_completed);
      });
  }

  loadUserAndSignup(req, res) {
    this.debug(req, 'loadUserAndSignup');

    return dbUsers
      .findById(req.user_id)
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
      .catch(err => {this.error(req, res, err)});
  }

  loggerPrefix(req) {
    return 'campaignBot.campaign:' + this.campaignId + ' user:' + req.user_id;
  }

  postReportback(req, res) {
    this.debug(req, 'postReportback');

    const postData = {
      source: process.env.DS_API_POST_SOURCE,
      uid: this.user.phoenix_id,
      quantity: this.reportbackSubmission.quantity,
      caption: this.reportbackSubmission.caption,
      file_url: this.reportbackSubmission.image_url,
    };
    if (this.reportbackSubmission.why_participated) {
      postData.why_participated = this.reportbackSubmission.why_participated;
    }

    return app.locals.phoenixClient.Campaigns
      .reportback(this.campaignId, postData)
      .then(reportbackId => {
        return this.postReportbackSuccess(req, res, reportbackId);
      })
      .catch(err => {
        this.reportbackSubmission.failed_at = Date.now();
        this.reportbackSubmission.save();

        return this.error(req, res, `postReportback ${err}`);
      });
  }

  /**
   * Handles successful Reportback POST request.
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {number} rbid - Returned reportback id
   */
  postReportbackSuccess(req, res, rbid) {
    this.debug(req, `postReportbackSuccess reportback:${rbid}`);

    const dateSubmitted = Date.now();
    this.reportbackSubmission.submitted_at = dateSubmitted;
    this.signup.reportback = rbid;
    this.signup.total_quantity_submitted = this.reportbackSubmission.quantity;
    this.signup.updated_at = dateSubmitted;
    // Unset draft so next time user returns to this campaign, we create a new
    // reportback submission.
    this.signup.draft_reportback_submission = undefined;
    return this.reportbackSubmission
      .save()
      .then(() => {
        return this.signup.save();
      })
      .then(() => {
        return this.sendMessage(req, res, this.bot.msg_menu_completed);
      });
  }

  postSignup(req, res) {
    this.debug(req, 'postSignup');

    // @todo Sanity check by using Northstar getSignups for user/campaign before
    // requesting POST signup from Phoenix

    const postData = {
      source: process.env.DS_API_POST_SOURCE,
      uid: this.user.phoenix_id,
    };

    return app.locals.phoenixClient.Campaigns
      .signup(this.campaignId, postData)
      .then(signupId => {
        this.debug(req, `created signup:${signupId}`);

        return dbSignups.create({
          _id: signupId,
          campaign: this.campaignId,
          user: req.user_id,
        });
      })
      .then(signupDoc => {
        const signupDocId = signupDoc._id;
        this.debug(req, `created signupDoc:${signupDocId}`)
        // Store as the User's current Signup for this Campaign.
        this.user.campaigns[this.campaignId] = signupDocId;
        this.user.markModified('campaigns');

        return this.user.save();
      })
      .then(() => {
        return this.sendMessage(req, res, this.bot.msg_menu_signedup);
      });
  }

  sendMessage(req, res, msgTxt) {
    if (!msgTxt) {
      return this.error(req, res, 'sendMessage no msgTxt');
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

    const optInPath = this.mobileCommonsConfig.oip_chat;
    if (!optInPath) {
      return this.error(req, res, 'sendMessage !optInPath');
    }

    mobilecommons.chatbot({phone: this.user.mobile}, optInPath, msgTxt);
    res.send({message: msgTxt});
  }

  supportsMMS(req, res) {
    this.debug(req, 'supportsMMS');

    if (this.user.supports_mms === true) {
      return true;
    }

    // @todo DRY this logic.
    // @see loadSignup()
    const incomingCommand = helpers.getFirstWord(req.incoming_message);
    if (incomingCommand && incomingCommand.toUpperCase() === CMD_REPORTBACK) {
      this.sendMessage(req, res, this.bot.msg_ask_supports_mms);
      return false;
    }
    
    if (!helpers.isYesResponse(req.incoming_message)) {
      this.sendMessage(req, res, this.bot.msg_no_supports_mms);
      return false;
    }

    this.user.supports_mms = true;
    return this.user
      .save()
      .then(() => {
        return this.createReportbackSubmission(req, res);
      });
  };
};

module.exports = CampaignBotController;
