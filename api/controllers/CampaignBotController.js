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

  /**
   * Controls chatbot conversations to Signup and Reportback to DS Campaigns.
   * @constructor
   * @param {number} campaignBotId - Campaignbot to use for response content.
   */
  constructor(campaignBotId) {
    this.bot = app.getConfig(app.ConfigName.CAMPAIGNBOTS, campaignBotId);
    logger.info(`CampaignBotController loaded campaignBot:${campaignBotId}`);

    if (!this.bot) {
      return this.error(req, `CampaignBot not found for id:${campaignBotId}`);
    }
  }

  /**
   * Handles asking for and saving the given property to our draft submission.
   * Posts completed submissions to DS API
   * @param {object} req
   * @param {property} string - The ReportbackSubmission property to get/save
   * @param {bool} ask - If true, returns the ask message to send, else
   *     validate, save, and send message to ask for next property.
   */
  collectReportbackProperty(req, property, ask) {
    this.debug(req, `collectReportbackProperty:${property}`);

    if (req.query.start || ask) {
      return this.renderResponseMessage(req, this.bot[`msg_ask_${property}`]);
    }
    
    let input = req.incoming_message;

    if (property === 'quantity') {
      if (helpers.hasLetters(input) || !parseInt(input)) {
        return this.renderResponseMessage(req, this.bot.msg_invalid_quantity);
      }
      input = parseInt(input);
    }
    else if (property === 'photo') {
      input = req.incoming_image_url;
      if (!input) {
        return this.renderResponseMessage(req, this.bot.msg_no_photo_sent);
      }
    }

    req.signup.draft_reportback_submission[property] = input;

    return req.signup.draft_reportback_submission
      .save()
      .then(() => {
        this.debug(req, `saved ${property}:${input}`);
        switch(property) {
          case 'quantity':
            return this.renderResponseMessage(req, this.bot.msg_ask_photo);
          case 'photo':
            return this.renderResponseMessage(req, this.bot.msg_ask_caption);
          case 'caption':
            // @todo Only ask for why when first reportback.
            return this.renderResponseMessage(req, this.bot.msg_ask_why_participated);
          default:
            return this.postReportback(req);
        }
      });
  }

  /**
   * Handles conversation for collecting ReportbackSubmission data or posting.
   * @param {object} req
   */
  continueReportbackSubmission(req) {
    this.debug(req, 'continueReportbackSubmission');

    const submission = req.signup.draft_reportback_submission;
    const ask = ( req.query.start || false );

    if (!submission.quantity) {
      return this.collectReportbackProperty(req, 'quantity', ask);
    }
    if (!submission.photo) {
      return this.collectReportbackProperty(req, 'photo', ask);
    } 
    if (!submission.caption) {
      return this.collectReportbackProperty(req, 'caption', ask);
    }
    if (!submission.why_participated) {
      return this.collectReportbackProperty(req, 'why_participated', ask);
    }

    // If we're here, we have a completed submission but the POST request
    // likely failed.
    // TODO: Check failed_at before sending? Message about whoops trying again?
    logger.warn('no messages sent from continueReportbackSubmission');
    return this.postReportback(req);
  }

  /**
   * Creates new ReportbackSubmission model and updates Signup model's draft.
   * @param {object} req
   * @return {string} - Message to send and begin collecting Reportback data.
   */
  createReportbackSubmission(req) {
    this.debug(req, 'createReportbackSubmission');

    return app.locals.db.reportbackSubmissions
      .create({
        campaign: req.campaign_id,
        user: req.user_id, 
      })
      .then(reportbackSubmission => {
        this.debug(req, `created :${reportbackSubmission._id.toString()}`);
        req.signup.draft_reportback_submission = reportbackSubmission._id;

        return req.signup.save();
      })
      .then(() => {
        this.debug(req, `updated signup:${req.signup._id.toString()}`)

        return this.collectReportbackProperty(req, 'quantity', true);
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
   * Gets Signup from DS API if exists for given user, else creates new Signup.
   * @param {object} req - Expects loaded req.user
   * @return {object} - Signup model
   */
  getCurrentSignup(req) {
    this.debug(req, 'getCurrentSignup');
    let signup;

    return app.locals.clients.northstar.Signups.index({
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

      return app.locals.db.signups.create(data);
    })
    .then(signupDoc => {
      this.debug(req, `created signupDoc:${signupDoc._id.toString()}`);
      signup = signupDoc;
      req.user.campaigns[req.campaign_id] = signupDoc._id;
      req.user.markModified('campaigns');
      return req.user.save();
    })
    .then(() => {
      return signup;
    });
  }

  /**
   * Gets User from DS API if exists for given id, else creates new User.
   * @param {string} id - DS User ID
   * @return {object} - User model
   */
  getUser(id) {
    return app.locals.clients.northstar.Users
      .get('id', id)
      .then(user => {
        if (!user) {
          // TODO: Create new User
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
   * Returns whether incomingMessage should begin a Reportback conversation.
   * @param {string} incomingMessage
   * @return {bool}
   */
  isCommandReportback(incomingMessage) {
    const firstWord = helpers.getFirstWord(incomingMessage);
    return ( firstWord && firstWord.toUpperCase() === CMD_REPORTBACK );
  }

  /**
   * Loads Signup model if exists for given id, else get/create from API.
   * @param {number} id - DS Signup ID
   * @return {object}
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
   * Loads User model if exists for given id, else get/create from API.
   * @param {string} id - DS User ID (Northstar)
   * @return {object}
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

  /**
   * Helper function for this.debug and this.error functions.
   * @param {object} req - Expects req.user_id, req.campaign_id set
   * @return {string}
   */
  loggerPrefix(req) {
    return 'campaignBot.campaign:' + req.campaign_id + ' user:' + req.user_id;
  }

  /**
   * Posts ReportbackSubmission to DS API for incoming Express req
   * @param {object} req - Expects loaded req.user, req.signup
   * @return {Promise}
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

    return app.locals.clients.phoenix.Campaigns
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
   * @param {number} rbid - Reportback id returned from our post to DS API.
   * @return {string}
   */
  postReportbackSuccess(req, rbid) {
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
        req.signup.draft_reportback_submission = undefined;
        req.signup.save();
      })
      .then(() => {
        return this.renderResponseMessage(req, this.bot.msg_menu_completed);
      });
  }

  /**
   * Posts signup to DS API and returns cached signup.
   * @param {number} user - A User model (we need to pass its phoenix_id)
   * @param {number} campaignId - Our DS Campaign ID
   * @return {object} - Returned Signup model
   */
  postSignup(user, campaignId) {
    this.debug(req, 'postSignup');

    return app.locals.clients.phoenix.Campaigns
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

  /**
   * Replaces placeholder variables in given msgTxt with data from incoming req
   * @param {object} req - Express request, with loaded req.campaign, req.signup
   * @param {string} msgTxt - Message to send back to Express request req
   * @return {string} - Message to send, with variables replaced with req data
   */
  renderResponseMessage(req, msgTxt) {
    if (!msgTxt) {
      return this.error(req, 'getMessage no msgTxt');
    }

    msgTxt = msgTxt.replace(/<br>/gi, '\n');
    msgTxt = msgTxt.replace(/{{title}}/gi, req.campaign.title);
    msgTxt = msgTxt.replace(/{{rb_noun}}/gi, req.campaign.rb_noun);
    msgTxt = msgTxt.replace(/{{rb_verb}}/gi, req.campaign.rb_verb);

    if (req.signup) {
      let quantity = req.signup.total_quantity_submitted
      if (req.signup.draft_reportback_submission) {
        quantity = req.signup.draft_reportback_submission.quantity;
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

};

module.exports = CampaignBotController;
