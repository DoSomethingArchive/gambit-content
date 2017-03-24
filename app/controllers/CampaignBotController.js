'use strict';

/**
 * Imports.
 */
const logger = app.locals.logger;
const helpers = rootRequire('lib/helpers');

/**
 * CampaignBotController.
 * To be deprecated as we refactor functions as relevant Mongoose static/instance methods.
 */
class CampaignBotController {

  /**
   * TODO: Move validation logic into routes/chatbot, save logic into Reportback Submission model.
   * Handles asking for and saving the given property to our draft submission.
   * Posts completed submissions to DS API
   * @param {object} req - Express request
   * @param {property} string - The ReportbackSubmission property to get/save
   * @param {bool} ask - If true, returns the ask message to send, else
   *     validate, save, and send message to ask for next property.
   */
  collectReportbackProperty(req, property, ask) {
    this.debug(req, `collectReportbackProperty:${property}`);
    const msgType = `ask_${property}`;

    if (ask || req.keyword) {
      return msgType;
    }

    // Begin validation.
    let input = req.incoming_message;

    // TODO: Improve quantity check by looking for commas: @see gambit issue#608
    // Search string for numbers to accept values like "Around 100" or "60 bumble bands"
    const validQuantity = Number(input) && !helpers.hasLetters(input);
    const validTextProperty = input && input.length > 3 && helpers.hasLetters(input);

    if (property === 'quantity') {
      if (!validQuantity) {
        return 'invalid_quantity';
      }
      input = Number(input);
    } else if (property === 'photo') {
      input = req.incoming_image_url;
      if (!input) {
        return 'no_photo_sent';
      }
    } else if (!validTextProperty) {
      logger.debug(`invalid ${property} sent`);

      return `invalid_${property}`;
    }

    const submission = req.signup.draft_reportback_submission;
    submission[property] = input;

    return submission
      .save()
      .then(() => {
        this.debug(req, `saved ${property}:${input}`);

        if (property === 'quantity') {
          return 'ask_photo';
        } else if (property === 'photo') {
          return 'ask_caption';
        } else if (property === 'caption') {
          if (!this.hasReportedBack(req)) {
            return 'ask_why_participated';
          }
        }

        return this.postReportback(req);
      });
  }

  /**
   * TODO: Refactor, move this logic into the router.
   * Handles conversation for collecting ReportbackSubmission data or posting.
   * @param {object} req - Express request
   */
  continueReportbackSubmission(req) {
    this.debug(req, 'continueReportbackSubmission');

    const submission = req.signup.draft_reportback_submission;
    const ask = req.keyword || req.broadcast_id;

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
   * Wrapper function for logger.debug(msg)
   */
  debug(req, msg) {
    logger.debug(`${this.loggerPrefix(req)} ${msg}`);
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
   * Helper function for this.debug and this.error functions.
   * @param {object} req - Express request
   * @return {string}
   */
  loggerPrefix(req) {
    let userId = null;
    if (req.user) {
      userId = req.user._id;
    }
    let campaignId = null;
    if (req.campaign) {
      campaignId = req.campaign.id;
    }

    return `campaignBot.campaign:${campaignId} user:${userId}`;
  }

  /**
   * Posts ReportbackSubmission to DS API for incoming Express req
   * @param {object} req - Express request
   * @return {Promise}
   */
  postReportback(req) {
    this.debug(req, 'postReportback');

    return req.signup
      .postDraftReportbackSubmission()
      .then(() => 'menu_completed')
      .catch((err) => {
        const scope = err;
        scope.message = `postReportback error:${err.message}`;

        return scope;
      });
  }

}

module.exports = CampaignBotController;
