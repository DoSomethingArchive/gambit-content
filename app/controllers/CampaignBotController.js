'use strict';

/**
 * Imports.
 */
const logger = app.locals.logger;
const helpers = rootRequire('lib/helpers');

const DS_API_POST_SOURCE = process.env.DS_API_POST_SOURCE || 'sms-mobilecommons';

/**
 * CampaignBotController.
 * Likely to be deprecated as we refactor functions as relevant Mongoose static/instance methods.
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

    if (ask || req.keyword) {
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
          if (!this.hasReportedBack(req)) {
            return this.renderResponseMessage(req, 'ask_why_participated');
          }
        }

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
    const ask = req.keyword;

    if (!submission.quantity) {
      return this.collectReportbackProperty(req, 'quantity', ask);
    }
    if (!submission.photo) {
      return this.collectReportbackProperty(req, 'photo', ask);
    }
    if (!submission.caption) {
      return this.collectReportbackProperty(req, 'caption', ask);
    }

    const askWhy = !this.hasReportedBack(req) && !submission.why_participated;
    if (askWhy) {
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
    const scope = req;

    return app.locals.db.reportback_submissions
      .create({
        campaign: req.campaign._id,
        user: req.user._id,
      })
      .then(reportbackSubmission => {
        this.debug(scope, `created reportbackSubmission:${reportbackSubmission._id.toString()}`);
        scope.signup.draft_reportback_submission = reportbackSubmission._id;

        return scope.signup.save();
      })
      .then(() => {
        this.debug(scope, `updated signup:${scope.signup._id.toString()}`);

        return this.collectReportbackProperty(scope, 'quantity', true);
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
   * Returns whether current user has submitted a Reportback for the current campaign.
   * @param {object} req
   * @return {bool}
   */
  hasReportedBack(req) {
    const result = req.signup && req.signup.total_quantity_submitted;

    return result;
  }

  /**
   * Returns whether incoming request is the given command type.
   * @param {object} req
   * @param {string} type
   * @return {bool}
   */
  isCommand(req, type) {
    this.debug(req, `isCommand:${type}`);

    if (!type) {
      return false;
    }

    const configName = `GAMBIT_CMD_${type.toUpperCase()}`;
    const configValue = process.env[configName];
    if (!configValue) {
      logger.warn(`${this.loggerPrefix(req)} process.env.${configName} is undefined`);

      return false;
    }

    const result = this.parseCommand(req) === configValue.toUpperCase();

    if (result && type === 'clear_cache') {
      if (!this.isStaff(req.user)) {
        logger.warn(`${this.loggerPrefix(req)} unauthorized command clear_cache`);

        return false;
      }
    }

    return result;
  }

  /**
   * TODO: Move to User as instance function.
   * Returns whether given user is DS staff.
   * @param {object} user
   * @return {bool}
   */
  isStaff(user) {
    const result = user.role && (user.role === 'staff' || user.role === 'admin');

    return result;
  }

  /**
   * Helper function for this.debug and this.error functions.
   * @param {object} req - Express request
   * @return {string}
   */
  loggerPrefix(req) {
    let userID = null;
    if (req.user) {
      userID = req.user._id;
    }
    let campaignID = null;
    if (req.campaign) {
      campaignID = req.campaign._id;
    }

    return `campaignBot.campaign:${campaignID} user:${userID}`;
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
      source: DS_API_POST_SOURCE,
      uid: req.user.phoenix_id,
      quantity: submission.quantity,
      caption: submission.caption,
      file_url: submission.photo,
    };
    if (submission.why_participated) {
      data.why_participated = submission.why_participated;
    }

    return app.locals.clients.phoenix.Campaigns
      .reportback(req.campaign._id, data)
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

        const signup = req.signup;
        signup.reportback = rbid;
        signup.total_quantity_submitted = Number(req.signup.draft_reportback_submission.quantity);
        signup.updated_at = dateSubmitted;
        signup.draft_reportback_submission = undefined;
        return signup.save();
      })
      .then((signupDoc) => {
        const scope = req;
        scope.signup = signupDoc;
        this.debug(req, `updated signup:${scope.signup._id}`);

        return this.renderResponseMessage(scope, 'menu_completed');
      });
  }

  /**
   * Replaces placeholder variables in given msgTxt with data from incoming req
   * @param {object} req - Express request
   * @param {string} msgType - Type of bot message to send back
   * @return {string} - msgTxt with all variables replaced with req properties
   */
  renderResponseMessage(req, msgType) {
    logger.debug(`renderResponseMessage:${msgType}`);
    const campaign = req.campaign;

    const botProperty = `msg_${msgType}`;
    let msg = this.bot[botProperty];
    if (!campaign) {
      return msg;
    }
    // Check if campaign has an override defined.
    if (campaign[botProperty]) {
      msg = campaign[botProperty];
    }

    if (!msg) {
      return this.error(req, 'bot msgType not found');
    }

    if (!req.campaign) {
      logger.error('renderResponseMessage req.campaign undefined');

      return msg;
    }

    msg = msg.replace(/{{br}}/gi, '\n');
    msg = msg.replace(/{{title}}/gi, campaign.title);
    msg = msg.replace(/{{tagline}}/i, campaign.tagline);
    msg = msg.replace(/{{fact_problem}}/gi, campaign.fact_problem);
    msg = msg.replace(/{{rb_noun}}/gi, campaign.rb_noun);
    msg = msg.replace(/{{rb_verb}}/gi, campaign.rb_verb);
    msg = msg.replace(/{{rb_confirmation_msg}}/i, campaign.msg_rb_confirmation);
    msg = msg.replace(/{{cmd_reportback}}/i, process.env.GAMBIT_CMD_REPORTBACK);
    msg = msg.replace(/{{cmd_member_support}}/i, process.env.GAMBIT_CMD_MEMBER_SUPPORT);

    if (campaign.keywords.length) {
      let keyword = campaign.keywords[0].toUpperCase();
      if (req.signup && req.signup.keyword) {
        keyword = req.signup.keyword.toUpperCase();
      }
      msg = msg.replace(/{{keyword}}/i, keyword);
    }

    if (req.signup) {
      let quantity = req.signup.total_quantity_submitted;
      if (req.signup.draft_reportback_submission) {
        quantity = req.signup.draft_reportback_submission.quantity;
      }
      msg = msg.replace(/{{quantity}}/gi, quantity);
    }

    const revisiting = req.keyword && req.signup && req.signup.draft_reportback_submission;
    if (revisiting) {
      // TODO: New bot property for continue draft message
      const continueMsg = 'Picking up where you left off on';
      msg = `${continueMsg} ${campaign.title}...\n\n${msg}`;
    }

    return msg;
  }

}

module.exports = CampaignBotController;
