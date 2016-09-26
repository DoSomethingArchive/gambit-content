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

    this.debug(req, `loadUser:${req.user_id}`);

    return this
      .loadUser(req.user_id)
      .then(user => {
        this.debug(req, `loaded user:${user._id}`);

        this.user = user;
        const signupId = user.campaigns[this.campaignId];
        this.debug(req, `loadSignup:${signupId}`);

        return this.loadSignup(signupId);
      })
      .then(signup => {
        this.debug(req, `loaded signup:${signup._id}`);
        req.signup = signup;
        const reportbackSubmissionId = signup.draft_reportback_submission;
        this.debug(req, `loadReportbackSubmission:${reportbackSubmissionId}`);
        
        return this.loadReportbackSubmission(reportbackSubmissionId);
      })
      .then(reportbackSubmission => {
        let msgTxt;
        if (!reportbackSubmission) {
          if (req.signup.total_quantity_submitted) {
             msgTxt = this.getMessage(req, this.bot.msg_menu_completed);
          }
          else {
            msgTxt = this.getMessage(req, this.bot.msg_menu_signedup);
          }
        }
        mobilecommons.chatbot(req.body, mobileCommonsCampaign, msgTxt);

        return res.send({message: msgTxt});;
      })
      .catch(err => {
        this.error(req, res, err);
      });
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

  debug(req, debugMsg) {
    logger.debug(`${this.loggerPrefix(req)} ${debugMsg}`);
  }

  error(req, res, err) {
    logger.error(`${this.loggerPrefix(req)} ${err}:${err.stack}`);

    return res.sendStatus(500);
  }

  /**
   * Queries DS API to find current signup, else creates new signup.
   */
  getSignup() {
    return app.locals.northstarClient.Signups.index({
      campaigns: this.campaignId,
      user: this.user._id,
    })
    .then(signups => {
      if (!signups.length) {
        return this.postSignup();
      }
      // @todo Loop through signups to find signup where campaign_run.current.
      // Hardcoded to first result for now.
      const currentSignup = signups[0];
      const data = {
        _id: currentSignup.id,
        user: this.user._id,
        campaign: this.campaignId,
        created_at: currentSignup.created_at,
      };
      if (currentSignup.reportback) {
        data.reportback = parseInt(currentSignup.reportback.id);
        data.total_quantity_submitted = currentSignup.reportback.quantity;
      }
      return data;
    })
    .then(signup => {
      return dbSignups.create(signup)
    })
    .then(signupDoc => {
      this.user.campaigns[this.campaignId] = signupDoc._id;
      this.user.markModified('campaigns');
      return this.user.save();
    });
  }

  /**
   * Queries DS API to find existing user, else creates new user.
   */
  getUser(id) {
    return app.locals.northstarClient.Users
      .get('id', id)
      .then(user => {
        if (!user) {
          // @todo Create new User
          return;
        }
        return dbUsers.create({
          _id: id,
          mobile: user.mobile,
          first_name: user.firstName,
          email: user.email,
          phoenix_id: user.drupalID,
          campaigns: {},   
        });
      });
  }

  /**
   * Returns reportback submission and sends message to user.
   */
  loadReportbackSubmission(id) {

    return dbRbSubmissions
      .findById(id)
      .exec();

      // .then(reportbackSubmissionDoc => {
      //   this.reportbackSubmission = reportbackSubmissionDoc;
      //   const promptUser = (req.query.start || false);

      //   if (!this.reportbackSubmission.quantity) {
      //     return this.collectQuantity(req, res, promptUser);
      //   }
      //   if (!this.reportbackSubmission.image_url) {
      //     return this.collectPhoto(req, res, promptUser);
      //   }
      //   if (!this.reportbackSubmission.caption) {
      //     return this.collectCaption(req, res, promptUser);
      //   }
      //   if (!this.reportbackSubmission.why_participated) {
      //     return this.collectWhyParticipated(req, res, promptUser);
      //   }
      //   // Should have submitted in whyParticipated, but in case of failed_at:
      //   logger.warn('no messages sent from chatReportback');

      //   return this.postReportback(req, res);
      // });
  }

  /**
   * Returns signup from cache if exists for id, else get/create from DS API.
   */
  loadSignup(id) {
    if (!id) {
      return this.getSignup();
    }

    return dbSignups
      .findById(id)
      .exec()
      .then(signupDoc => {
        if (signupDoc) {
          // @todo Validate signupDoc dates against current Campaign run dates.
          return signupDoc;
        }
        return this.getSignup();
      });
  }

  /**
   * Returns user from cache if exists for userId, else get/create from DS API.
   */
  loadUser(id) {
    return dbUsers
      .findById(id)
      .exec()
      .then(userDoc => {
        if (userDoc) {
          return userDoc;
        }
        return this.getUser(id);
      })
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

  /**
   * Posts signup to DS API and returns cached signup.
   */
  postSignup() {
    this.debug(req, 'postSignup');

    return app.locals.phoenixClient.Campaigns
      .signup(this.campaignId, {
        source: process.env.DS_API_POST_SOURCE,
        uid: this.user.phoenix_id,
      })
      .then(signupId => {
        return {
          _id: signupId,
          campaign: this.campaignId,
          user: this.user._id,
        };
      });
  }

  getMessage(req, msgTxt) {
    if (!msgTxt) {
      return this.error(req, res, 'sendMessage no msgTxt');
    }

    msgTxt = msgTxt.replace(/<br>/gi, '\n');
    msgTxt = msgTxt.replace(/{{title}}/gi, this.campaign.title);
    msgTxt = msgTxt.replace(/{{rb_noun}}/gi, this.campaign.rb_noun);
    msgTxt = msgTxt.replace(/{{rb_verb}}/gi, this.campaign.rb_verb);

    if (req.signup) {
      var quantity = req.signup.total_quantity_submitted
      // If a draft exists, use the reported draft from draft, as we're continuing
      // the ReportbackSubmission.
      if (req.reportbackSubmission) {
        quantity = req.reportbackSubmission.quantity;
      }
      msgTxt = msgTxt.replace(/{{quantity}}/gi, quantity);
    }

    if (req.query.start && req.signup && req.draft_reportback_submission) {
      // @todo New bot property for continue draft message
      var continueMsg = 'Picking up where you left off on ' + this.campaign.title;
      msgTxt = continueMsg + '...\n\n' + msgTxt;
    }

    if (process.env.NODE_ENV !== 'production') {
      msgTxt = '@stg: ' + msgTxt;
    }

    return msgTxt;
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
