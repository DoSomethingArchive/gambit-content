'use strict';

// Third party modules
const express = require('express');
const logger = require('winston');

// Application modules
const helpers = require('../../lib/helpers');

// configs
const requiredParamsConf = require('../../config/middleware/chatbot/required-params');
const userIncomingMessageConf = require('../../config/middleware/chatbot/user-incoming-message');
const mapParamsConf = require('../../config/middleware/chatbot/map-request-params');

// Middleware
const requiredParamsMiddleware = require('../../lib/middleware/required-params');
const userIncomingMessageMiddleware = require('../../lib/middleware/user-incoming-message');
const mapRequestParamsMiddleware = require('../../lib/middleware/map-request-params');
const getUserMiddleware = require('../../lib/middleware/user-get');
const createNewUserIfNotFoundMiddleware = require('../../lib/middleware/user-create');
const processBroadcastConversationMiddleware = require('../../lib/middleware/broadcast');
const getPhoenixCampaignMiddleware = require('../../lib/middleware/phoenix-campaign-get');
const getSignupMiddleware = require('../../lib/middleware/signup-get');
const createNewSignupIfNotFoundMiddleware = require('../../lib/middleware/signup-create');
const validateRequestMiddleware = require('../../lib/middleware/validate');

// Router
const router = express.Router(); // eslint-disable-line new-cap

/**
 * Check for required parameters,
 * parse incoming params, and add/log helper variables.
 */
router.use(requiredParamsMiddleware(requiredParamsConf));
router.use(userIncomingMessageMiddleware(userIncomingMessageConf));
router.use(mapRequestParamsMiddleware(mapParamsConf));

router.use(
  /**
   * Check if DS User exists for given mobile number.
   */
  getUserMiddleware(),
  /**
   * Create DS User for given mobile number if we didn't find one.
   */
  createNewUserIfNotFoundMiddleware());

/**
 * Checks if request is a negative response to a broadcast
 */
router.use(processBroadcastConversationMiddleware());

/**
 * Load Campaign from DS Phoenix API.
 */
router.use(getPhoenixCampaignMiddleware());

router.use(
  /**
   * Check DS Phoenix API for existing Signup.
   */
  getSignupMiddleware(),
  /**
   * If Signup wasn't found, post Signup to DS Phoenix API.
   */
  createNewSignupIfNotFoundMiddleware());

/**
 * Run sanity checks
 */
router.use(validateRequestMiddleware());

/**
 * Check for non-reportback conversation messages first for sending reply message.
 */
router.post('/', (req, res, next) => {
  if (helpers.isCommand(req.incoming_message, 'member_support')) {
    return helpers.endConversationWithMessageType(req, res, 'member_support');
  }

  req.isNewConversation = req.keyword || req.broadcast_id; // eslint-disable-line no-param-reassign

  // If user is reporting back, skip to next.
  if (req.signup.draft_reportback_submission) {
    return next();
  }

  if (helpers.isCommand(req.incoming_message, 'reportback')) {
    return req.signup.createDraftReportbackSubmission()
      .then(() => helpers.continueConversationWithMessageType(req, res, 'ask_quantity'))
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  // If member has completed this campaign:
  if (req.signup.reportback) {
    if (req.isNewConversation) {
      return helpers.continueConversationWithMessageType(req, res, 'menu_completed');
    }
    // Otherwise member didn't text back a Reportback or Member Support command.
    return helpers.continueConversationWithMessageType(req, res, 'invalid_cmd_completed');
  }

  if (req.isNewConversation) {
    return helpers.continueConversationWithMessageType(req, res, 'menu_signedup_gambit');
  }

  return helpers.continueConversationWithMessageType(req, res, 'invalid_cmd_signedup');
});

/**
 * Find message type to reply with based on current Reportback Submission and data submitted in req.
 */
router.post('/', (req, res, next) => {
  const draft = req.signup.draft_reportback_submission;
  const input = req.incoming_message;
  logger.debug(`draft_reportback_submission:${draft._id}`);

  if (!draft.quantity) {
    if (req.isNewConversation) {
      return helpers.continueConversationWithMessageType(req, res, 'ask_quantity');
    }
    if (!helpers.isValidReportbackQuantity(input)) {
      return helpers.continueConversationWithMessageType(req, res, 'invalid_quantity');
    }

    draft.quantity = Number(input);

    return draft.save()
      .then(() => helpers.continueConversationWithMessageType(req, res, 'ask_photo'))
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  if (!draft.photo) {
    if (req.isNewConversation) {
      return helpers.continueConversationWithMessageType(req, res, 'ask_photo');
    }
    if (!req.incoming_image_url) {
      return helpers.continueConversationWithMessageType(req, res, 'no_photo_sent');
    }

    draft.photo = req.incoming_image_url;

    return draft.save()
      .then(() => helpers.continueConversationWithMessageType(req, res, 'ask_caption'))
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  if (!draft.caption) {
    if (req.isNewConversation) {
      return helpers.continueConversationWithMessageType(req, res, 'ask_caption');
    }
    if (!helpers.isValidReportbackText(input)) {
      return helpers.continueConversationWithMessageType(req, res, 'invalid_caption');
    }

    draft.caption = helpers.trimReportbackText(input);

    return draft.save()
      .then(() => {
        // If member hasn't submitted a reportback yet, ask for why_participated.
        if (!req.signup.total_quantity_submitted) {
          return helpers.continueConversationWithMessageType(req, res, 'ask_why_participated');
        }

        // Otherwise skip to post reportback to DS API.
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  if (!draft.why_participated) {
    if (req.isNewConversation) {
      return helpers.continueConversationWithMessageType(req, res, 'ask_why_participated');
    }
    if (!helpers.isValidReportbackText(input)) {
      return helpers.continueConversationWithMessageType(req, res, 'invalid_why_participated');
    }

    draft.why_participated = helpers.trimReportbackText(input);

    return draft.save()
      .then(() => next())
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  return next();
});

/**
 * If we've made it this far, time to submit the completed draft reportback submission.
 */
router.post('/', (req, res) => {
  req.signup.postDraftReportbackSubmission()
    .then(() => {
      helpers.handleTimeout(req, res);

      return helpers.continueConversationWithMessageType(req, res, 'menu_completed');
    })
    .catch(err => helpers.handlePhoenixPostError(req, res, err));
});

module.exports = router;
