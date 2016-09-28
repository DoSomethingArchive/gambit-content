"use strict";

/**
 * Imports.
 */
const logger = rootRequire('lib/logger');
const mobilecommons = rootRequire('lib/mobilecommons');
const helpers = rootRequire('lib/helpers');

/**
 * Setup.
 */
const CMD_REPORTBACK = (process.env.GAMBIT_CMD_REPORTBACK || 'P');

/**
 * CampaignBotController.
 */
class CampaignBotController {

  constructor(campaignBotId) {
    this.bot = app.getConfig(app.ConfigName.CAMPAIGNBOTS, campaignBotId);
    logger.info(`CampaignBotController loaded campaignBot:${campaignBotId}`);

    if (!this.bot) {
      return this.error(req, 'bot config not found');
    }
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

  /**
   * Creates new reportbackSubmission document and updates our current signup.
   */
  createReportbackSubmission(req) {
    this.debug(req, 'createReportbackSubmission');

    return app.locals.db.reportbackSubmissions
      .create({
        campaign: req.campaign_id,
        user: req.user_id, 
      })
      .then(reportbackSubmission => {
        this.debug(req, `created submission:${reportbackSubmission._id.toString()}`)
        req.signup.draft_reportback_submission = reportbackSubmission._id;

        return req.signup.save();
      })
      .then(() => {
        this.debug(req, `updated signup:${req.signup._id.toString()}`)

        return this.getMessageForReportbackProperty(req, 'quantity', true);
      });
  }

  /**
   * Wrapper function for logger.debug(msg)
   */
  debug(req, msg) {
    logger.debug(`${this.loggerPrefix(req)} ${msg}`);
  }

  /**
   * Wrapper function for logger.error(error)
   */
  error(req, err) {
    logger.error(`${this.loggerPrefix(req)} ${err}:${err.stack}`);
  }

  /**
   * Get the message to send back for req and ReportbackSubmission property.
   */
  getMessageForReportbackProperty(req, property, ask) {
    this.debug(req, `getMessageForReportbackProperty:${property}`);
    this.debug(req, req.signup);

    if (req.query.start || ask) {
      return this.getMessage(req, this.bot[`msg_ask_${property}`]);
    }
    
    let input = req.incoming_message;
    if (property === 'photo') {
      input = req.incoming_image_url;
    }

    // @todo Validate input based on propertyName
    req.signup.draft_reportback_submission[property] = input;

    return req.signup.draft_reportback_submission
      .save()
      .then(() => {
        this.debug(req, `saved ${property}:${input}`);
        switch(property) {
          case 'quantity':
            return this.getMessage(req, this.bot.msg_ask_photo);
          case 'photo':
            return this.getMessage(req, this.bot.msg_ask_caption);
          case 'caption':
            // @todo Only ask for why when first reportback.
            return this.getMessage(req, this.bot.msg_ask_why_participated);
          default:
            return this.postReportback(req);
        }
      });
  }

  /**
   * Get the message to send back to user based on req and ReportbackSubmission.
   */
  continueReportbackSubmission(req) {
    this.debug(req, 'continueReportbackSubmission');
    this.debug(req, req.signup.draft_reportback_submission);

    const ask = (req.query.start || false);

    if (!req.signup.draft_reportback_submission.quantity) {
      return this.getMessageForReportbackProperty(req, 'quantity', ask);
    }
    if (!req.signup.draft_reportback_submission.photo) {
      return this.getMessageForReportbackProperty(req, 'photo', ask);
    } 
    if (!req.signup.draft_reportback_submission.caption) {
      return this.getMessageForReportbackProperty(req, 'caption', ask);
    }
    if (!req.signup.draft_reportback_submission.why_participated) {
      return this.getMessageForReportbackProperty(req, 'why_participated', ask);
    } 

    // Should have submitted in whyParticipated, but in case of failed_at:
    logger.warn('no messages sent from chatReportback');

    return this.postReportback(req);
  }

  /**
   * Queries DS API to find current signup, else creates new signup.
   */
  getCurrentSignup(req) {
    this.debug(req, 'getCurrentSignup');

    return app.locals.northstarClient.Signups.index({
      campaigns: req.campaign_id,
      user: req.user_id,
    })
    .then(signups => {
      logger.verbose(signups);

      if (!signups.length) {
        this.debug(req, `postSignup`);
        return this.postSignup(req);
      }
      
      // @todo Loop through signups to find signup where campaign_run.current.
      // Hardcoded to first result for now.
      const currentSignup = signups[0];
      this.debug(req, `currentSignup.id:${currentSignup.id}`);
      const data = {
        _id: parseInt(currentSignup.id),
        user: req.user_id,
        campaign: req.campaign_id,
        created_at: currentSignup.createdAt,
      };
      if (currentSignup.reportback) {
        data.reportback = parseInt(currentSignup.reportback.id);
        data.total_quantity_submitted = currentSignup.reportback.quantity;
      }
      this.debug(req, `data:${JSON.stringify(data)}`);
      return app.locals.db.signups.create(data);
    })
    .then(signupDoc => {
      this.debug(req, `created signupDoc:${signupDoc._id.toString()}`);

      req.user.campaigns[req.campaign_id] = signupDoc._id;
      req.user.markModified('campaigns');
      return req.user.save();
    })
    .then(() => {
      console.log(signupDoc);
      return signupDoc;
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
        return app.locals.db.users.create({
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
   * Returns whether incomingMessage should begin Reportback conversation.
   */
  isCommandReportback(incomingMessage) {
    const firstWord = helpers.getFirstWord(incomingMessage);
    return ( firstWord && firstWord.toUpperCase() === CMD_REPORTBACK );
  }

  /**
   * Returns signup from cache if exists for id, else get/create from DS API.
   */
  loadSignup(id) {
    return app.locals.db.signups
      .findById(id)
      .populate('draft_reportback_submission')
      .exec()
      .then(signup => {
        if (!signup) {
          // @todo Handle data loss. Changed this to getCurrentSignup to avoid
          // storing user/campaign on this 
          return this.getSignup();
        }

        // @todo Validate signupDoc dates against current Campaign run dates.
        return signup;        
      });
  }

  /**
   * Loads req.user from cache if exists for userId, else get/create from API.
   */
  loadUser(id) {
    return app.locals.db.users
      .findById(id)
      .exec()
      .then(user => {
        if (user) {
          return user;
        }
        return this.getUser(id);
      })
  }

  loggerPrefix(req) {
    return 'campaignBot.campaign:' + req.campaign_id + ' user:' + req.user_id;
  }

  /**
   * Posts ReportbackSubmission to DS API.
   */
  postReportback(req) {
    this.debug(req, 'postReportback');

    const submission = req.signup.draft_reportback_submission;
    const postData = {
      source: process.env.DS_API_POST_SOURCE,
      uid: req.user.phoenix_id,
      quantity: submission.quantity,
      caption: submission.caption,
      file_url: submission.photo,
    };
    if (submission.why_participated) {
      postData.why_participated = submission.why_participated;
    }

    return app.locals.phoenixClient.Campaigns
      .reportback(req.campaign_id, postData)
      .then(reportbackId => {
        return this.postReportbackSuccess(req, reportbackId);
      })
      .catch(err => {
        submission.failed_at = Date.now();
        req.signup.save();

        return this.error(req, `postReportback ${err}`);
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
    const submission = req.signup.draft_reportback_submission;
    submission.submitted_at = dateSubmitted;

    return submission
      .save()
      .then(() => {
        req.signup.reportback = rbid;
        req.signup.total_quantity_submitted = submission.quantity;
        req.signup.updated_at = dateSubmitted;
        // Unset draft so next time user returns to this campaign, we create new
        // reportback submission.
        req.signup.draft_reportback_submission = undefined;
        return this.getMessage(req, this.bot.msg_menu_completed);
      });
  }

  /**
   * Posts signup to DS API and returns cached signup.
   */
  postSignup(user, campaignId) {
    this.debug(req, 'postSignup');

    return app.locals.phoenixClient.Campaigns
      .signup(campaignId, {
        source: process.env.DS_API_POST_SOURCE,
        uid: user.phoenix_id,
      })
      .then(signupId => {
        return {
          _id: signupId,
          campaign: campaignId,
          user: user._id,
        };
      });
  }

  getMessage(req, msgTxt) {
    if (!msgTxt) {
      return this.error(req, 'sendMessage no msgTxt');
    }

    msgTxt = msgTxt.replace(/<br>/gi, '\n');
    msgTxt = msgTxt.replace(/{{title}}/gi, req.campaign.title);
    msgTxt = msgTxt.replace(/{{rb_noun}}/gi, req.campaign.rb_noun);
    msgTxt = msgTxt.replace(/{{rb_verb}}/gi, req.campaign.rb_verb);

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
      var continueMsg = 'Picking up where you left off on ' + req.campaign.title;
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
