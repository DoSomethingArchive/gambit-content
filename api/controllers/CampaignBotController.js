'use strict';

/**
 * Imports.
 */
const logger = rootRequire('lib/logger');
const helpers = rootRequire('lib/helpers');

const DS_API_POST_SOURCE = process.env.DS_API_POST_SOURCE || 'sms-mobilecommons';

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
   * Upserts model for given Northstar User.
   */
  cacheUser(northstarUser) {
    logger.debug(`cacheUser id:${northstarUser.id}`);

    const data = {
      _id: northstarUser.id,
      mobile: northstarUser.mobile,
      first_name: northstarUser.firstName,
      email: northstarUser.email,
      phoenix_id: northstarUser.drupalID,
      role: northstarUser.role,
      campaigns: {},
    };

    return app.locals.db.users
      .findOneAndUpdate({ _id: data._id }, data, {
        upsert: true,
        new: true,
      });
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
        keyword: req.keyword,
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
   * Gets User from DS API if exists for given type/id, else creates new User.
   * @param {object} req
   * @return {object} - User model
   */
  getUser(type, id) {
    logger.debug(`getUser type:${type} id:${id}`);

    return app.locals.clients.northstar.Users
      .get(type, id)
      .then((user) => {
        logger.debug('northstar.Users.get success');

        return this.cacheUser(user);
      })
      .catch(() => {
        logger.debug(`could not getUser type:${type} id:${id}`);

        return null;
      });
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
   * Returns whether given user is DS staff.
   * @param {object} user
   * @return {bool}
   */
  isStaff(user) {
    const result = user.role && (user.role === 'staff' || user.role === 'admin');

    return result;
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
  loadUser(req) {
    this.debug(req, 'loadUser');

    req.user_id = req.body.profile_northstar_id; // eslint-disable-line no-param-reassign
    // If request already contains a User ID, load from cache.
    if (req.user_id) {
      return app.locals.db.users
        .findById(req.user_id)
        .exec()
        .then(user => {
          if (!user) {
            this.debug(req, `no doc for user:${req.user_id}`);

            return this.getUser('id', req.user_id);
          }
          this.debug(req, `found doc for user:${req.user_id}`);

          return user;
        });
    }

    if (!req.body.phone) {
      logger.error('Undefined req.body.phone');

      return null;
    }

    // Check if Northstar User exists for mobile number.
    return this
      .getUser('mobile', req.body.phone)
      .then((user) => {
        if (!user) {
          return this.postUser(req);
        }

        return user;
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
   * Parse incoming request for User data to post to DS API.
   */
  parseMobilecommonsProfile(req) {
    const data = {
      mobile: req.body.phone,
    };
    if (req.body.profile_email) {
      data.email = req.body.profile_email;
    }
    if (req.body.profile_first_name) {
      data.first_name = req.body.profile_first_name;
    }
    if (req.body.profile_id) {
      data.mobilecommons_id = req.body.profile_id;
    }
    if (req.body.profile_postal_code) {
      data.addr_zip = req.body.profile_postal_code;
    }

    return data;
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
        source: DS_API_POST_SOURCE,
        uid: req.user.phoenix_id,
      })
      .then((signupId) => ({
        _id: signupId,
        campaign: req.campaign_id,
        user: req.user_id,
      }));
  }

  /**
   * Posts new User to DS API.
   */
  postUser(req) {
    this.debug(req, 'postUser');

    const data = this.parseMobilecommonsProfile(req);
    data.source = DS_API_POST_SOURCE;
    data.password = helpers.generatePassword(data.mobile);
    if (!data.email) {
      const defaultEmail = process.env.DS_API_DEFAULT_USER_EMAIL || 'mobile.import';
      data.email = `${data.mobile}@${defaultEmail}`;
    }

    return app.locals.clients.northstar.Users
      .create(data)
      .then((user) => {
        req.user_id = user.id; // eslint-disable-line no-param-reassign
        this.debug(req, `created user:${user.id}`);

        return this.cacheUser(user);
      });
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
    // Check if campaign has an override defined.
    if (campaign[botProperty]) {
      msg = campaign[botProperty];
    }

    if (!msg) {
      return this.error(req, 'bot msgType not found');
    }

    msg = msg.replace(/{{br}}/gi, '\n');
    msg = msg.replace(/{{title}}/gi, campaign.title);
    msg = msg.replace(/{{tagline}}/i, campaign.tagline);
    msg = msg.replace(/{{rb_noun}}/gi, campaign.rb_noun);
    msg = msg.replace(/{{rb_verb}}/gi, campaign.rb_verb);
    msg = msg.replace(/{{rb_confirmation_msg}}/i, campaign.msg_rb_confirmation);
    msg = msg.replace(/{{cmd_reportback}}/i, process.env.GAMBIT_CMD_REPORTBACK);
    msg = msg.replace(/{{cmd_member_support}}/i, process.env.GAMBIT_CMD_MEMBER_SUPPORT);

    if (campaign.keywords) {
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
