'use strict';

/**
 * Imports.
 */
const logger = rootRequire('lib/logger');
const helpers = rootRequire('lib/helpers');

/**
 * CampaignBotController.
 */
class CampaignBotController {

  /**
   * Controls chatbot conversations to Signup and Reportback to DS Campaigns.
   * @constructor
   * @param {object} campaignBot - CampaignBot model
   */
  constructor(campaignBot) {
    this.bot = campaignBot;
  }

  /**
   * Handles asking for and saving the given property to our draft submission.
   * Posts completed submissions to DS API
   * @param {object} req - Express request
   * @param {property} string - The ReportbackSubmission property to get/save
   * @param {bool} ask - If true, returns the ask message to send, else
   *     validate, save, and send message to ask for next property.
   */
  collectReportbackProperty(req, property, ask) {
    this.debug(req, `collectReportbackProperty:${property}`);

    if (req.query.campaign || ask || this.isKeywordCampaignBot(req)) {
      return this.renderResponseMessage(req, `ask_${property}`);
    }

    let input = req.incoming_message;

    // Validate input received for our given Reportback property.
    if (property === 'quantity') {
      if (helpers.hasLetters(input) || !Number(input)) {
        return this.renderResponseMessage(req, 'invalid_quantity');
      }
      input = Number(input);
    } else if (property === 'photo') {
      input = req.incoming_image_url;
      if (!input) {
        return this.renderResponseMessage(req, 'no_photo_sent');
      }
    }

    const submission = req.signup.draft_reportback_submission;
    submission[property] = input;

    return submission
      .save()
      .then(() => {
        this.debug(req, `saved ${property}:${input}`);

        if (property === 'quantity') {
          return this.renderResponseMessage(req, 'ask_photo');
        } else if (property === 'photo') {
          return this.renderResponseMessage(req, 'ask_caption');
        } else if (property === 'caption') {
          // TODO: Only ask for why when first reportback.
          return this.renderResponseMessage(req, 'ask_why_participated');
        }

        // If we made it this far, we're done collecting and ready to submit.
        return this.postReportback(req);
      });
  }

  /**
   * Handles conversation for collecting ReportbackSubmission data or posting.
   * @param {object} req - Express request
   */
  continueReportbackSubmission(req) {
    this.debug(req, 'continueReportbackSubmission');

    const submission = req.signup.draft_reportback_submission;
    const ask = req.query.campaign || false;

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
   * @param {object} req - Express request
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

        const currentSignup = req.signup;
        currentSignup.draft_reportback_submission = reportbackSubmission._id;

        return currentSignup.save();
      })
      .then(() => {
        this.debug(req, `updated signup:${req.signup._id.toString()}`);

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
   * @param {object} req - Express request
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
        return this.postSignup(req);
      }

      // TODO: Loop through signups to find signup where campaign_run.current.
      // Hardcoded to first result for now.
      const currentSignup = signups[0];
      this.debug(req, `currentSignup.id:${currentSignup.id}`);

      const data = {
        _id: Number(currentSignup.id),
        user: req.user_id,
        campaign: req.campaign_id,
        created_at: currentSignup.createdAt,
        // Delete existing draft submission in case we're updating existing
        // Signup model (e.g. if we're handling a clear cache command)
        draft_reportback_submission: null,
      };
      if (currentSignup.reportback) {
        data.reportback = Number(currentSignup.reportback.id);
        data.total_quantity_submitted = currentSignup.reportback.quantity;
      }

      return app.locals.db.signups
        .findOneAndUpdate({ _id: data._id }, data, { upsert: true, new: true })
        .exec();
    })
    .then((signupDoc) => {
      this.debug(req, `created signupDoc:${signupDoc._id.toString()}`);

      signup = signupDoc;
      const currentUser = req.user;
      currentUser.campaigns[req.campaign_id] = signupDoc._id;
      currentUser.markModified('campaigns');
      return currentUser.save();
    })
    .then(() => {
      this.debug(req, `updated user.campaigns[${req.campaign_id}]:${signup._id.toString()}`);

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
          // TODO: Edge case where User ID saved to Mobile Commons profile
          // is not found in DS API GET request.
        }
        const data = {
          _id: id,
          mobile: user.mobile,
          first_name: user.firstName,
          email: user.email,
          phoenix_id: user.drupalID,
          role: user.role,
          campaigns: {},
        };
        return app.locals.db.users
          .findOneAndUpdate({ _id: data._id }, data, {
            upsert: true,
            new: true,
          });
      });
  }

  /**
   * Returns whether incoming request is the given command type.
   * @param {object} req
   * @param {string} type
   * @return {bool}
   */
  isCommand(req, type) {
    if (!type) {
      return false;
    }

    const configName = `GAMBIT_CMD_${type.toUpperCase()}`;
    const configValue = process.env[configName];
    if (!configValue) {
      logger.error(`${this.loggerPrefix(req)} process.env.${configName} is undefined`);

      return false;
    }

    const isCommand = this.parseCommand(req) === configValue.toUpperCase();

    if (type === 'clear_cache') {
      const authorized = req.user.role && (req.user.role === 'staff' || req.user.role === 'admin');
      if (!authorized) {
        logger.warn(`${this.loggerPrefix(req)} unauthorized command clear_cache`);

        return false;
      }
    }

    return isCommand;
  }

  /**
   * Returns whether incoming request is the CampaignBot Mobile Commons keyword.
   * @param {object} req
   * @return {bool}
   */
  isKeywordCampaignBot(req) {
    const keyword = process.env.MOBILECOMMONS_KEYWORD_CAMPAIGNBOT;
    const isKeyword = this.parseCommand(req) == keyword.toUpperCase();

    return isKeyword;
  }

  /**
   * Loads Signup model if exists for given id, else get/create from API.
   * @param {object} req - Express request
   * @param {number} id - DS Signup ID
   * @return {object}
   */
  loadCurrentSignup(req, id) {
    this.debug(req, `loadCurrentSignup:${id}`);

    return app.locals.db.signups
      .findById(id)
      .populate('draft_reportback_submission')
      .exec()
      .then(signup => {
        if (!signup) {
          this.debug(req, `signup not found for id:${id}`);

          return this.getCurrentSignup(req);
        }

        // TODO Validate cached Signup is current by checking Campaign end date.
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
      });
  }

  /**
   * Helper function for this.debug and this.error functions.
   * @param {object} req - Express request
   * @return {string}
   */
  loggerPrefix(req) {
    return `campaignBot.campaign:${req.campaign_id} user:${req.user_id}`;
  }

  /**
   * Parse incoming request as Gambit command.
   */
  parseCommand(req) {
    return helpers.getFirstWordUppercase(req.incoming_message);
  }

  /**
   * Posts ReportbackSubmission to DS API for incoming Express req
   * @param {object} req - Express request
   * @return {Promise}
   */
  postReportback(req) {
    this.debug(req, 'postReportback');

    const submission = req.signup.draft_reportback_submission;
    const data = {
      source: process.env.DS_API_POST_SOURCE,
      uid: req.user.phoenix_id,
      quantity: submission.quantity,
      caption: submission.caption,
      file_url: submission.photo,
    };
    if (submission.why_participated) {
      data.why_participated = submission.why_participated;
    }

    return app.locals.clients.phoenix.Campaigns
      .reportback(req.campaign_id, data)
      .then(rbId => this.postReportbackSuccess(req, rbId))
      .catch((err) => {
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
        this.debug(req, `updated submission:${submission._id.toString()}`);

        /* eslint-disable no-param-reassign */
        req.signup.reportback = rbid;
        req.signup.total_quantity_submitted = req.signup.draft_reportback_submission.quantity;
        req.signup.updated_at = dateSubmitted;
        req.signup.draft_reportback_submission = undefined;
        /* eslint-enable no-param-reassign */
        req.signup.save();
      })
      .then(() => {
        this.debug(req, `updated signup:${req.signup._id}`);

        return this.renderResponseMessage(req, 'menu_completed');
      });
  }

  /**
   * Posts Signup to DS API and returns cached signup.
   * @param {object} req - Express request
   * @return {object} - Constructed Signup response object from new Signup id
   */
  postSignup(req) {
    this.debug(req, 'postSignup');

    return app.locals.clients.phoenix.Campaigns
      .signup(req.campaign_id, {
        source: process.env.DS_API_POST_SOURCE,
        uid: req.user.phoenix_id,
      })
      .then((signupId) => ({
        _id: signupId,
        campaign: req.campaign_id,
        user: req.user_id,
      }));
  }

  /**
   * Replaces placeholder variables in given msgTxt with data from incoming req
   * @param {object} req - Express request
   * @param {string} msgType - Type of bot message to send back
   * @return {string} - msgTxt with all variables replaced with req properties
   */
  renderResponseMessage(req, msgType) {
    this.debug(req, `renderResponseMessage:${msgType}`);
    const campaign = req.campaign;

    const botProperty = `msg_${msgType}`;
    let msg = this.bot[botProperty];

    if (!msg) {
      return this.error(req, 'bot msgType not found');
    }

    msg = msg.replace(/{{br}}/gi, '\n');
    msg = msg.replace(/{{title}}/gi, campaign.title);
    msg = msg.replace(/{{tagline}}/gi, campaign.tagline);
    msg = msg.replace(/{{rb_noun}}/gi, campaign.reportbackInfo.noun);
    msg = msg.replace(/{{rb_verb}}/gi, campaign.reportbackInfo.verb);
    msg = msg.replace(/{{rb_confirmed}}/gi, campaign.reportbackInfo.confirmationMessage);
    msg = msg.replace(/{{cmd_reportback}}/gi, process.env.GAMBIT_CMD_REPORTBACK);
    msg = msg.replace(/{{cmd_member_support}}/gi, process.env.GAMBIT_CMD_MEMBER_SUPPORT);
    msg = msg.replace(/{{keyword_continue}}/gi, process.env.MOBILECOMMONS_KEYWORD_CAMPAIGNBOT);

    if (req.signup) {
      let quantity = req.signup.total_quantity_submitted;
      if (req.signup.draft_reportback_submission) {
        quantity = req.signup.draft_reportback_submission.quantity;
      }
      msg = msg.replace(/{{quantity}}/gi, quantity);
    }

    const revisiting = req.query.campaign && req.signup && req.signup.draft_reportback_submission;
    if (revisiting || this.isKeywordCampaignBot(req)) {
      // TODO: New bot property for continue draft message
      const continueMsg = 'Picking up where you left off on';
      msg = `${continueMsg} ${campaign.title}...\n\n${msg}`;
    }

    return msg;
  }

  /**
   * Updates the given User model's current_campaign property to given campaignId.
   */
  setCurrentCampaign(user, campaignId) {
    if (campaignId === user.current_campaign) {
      return true;
    }

    return app.locals.db.users
      .findByIdAndUpdate(user._id, { current_campaign: campaignId })
      .exec();
  }

}

module.exports = CampaignBotController;
