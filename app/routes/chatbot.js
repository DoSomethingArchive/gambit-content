'use strict';

// Third party modules
const express = require('express');
const logger = require('winston');

// Application modules
const helpers = require('../../lib/helpers');
const ReplyDispatcher = require('../../lib/conversation/reply-dispatcher');
const replies = require('../../lib/conversation/replies');

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
const processUserSupportConversationMiddleware = require('../../lib/middleware/user-support-conversation');

// Router
const router = express.Router(); // eslint-disable-line new-cap

const replyDispatcher = new ReplyDispatcher();

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
 * Conversation Processing
 */

router.use(

  /**
   * If the user texts the support command we will process this request here
   */
  processUserSupportConversationMiddleware());

/**
 * Check for non-reportback conversation messages first for sending reply message.
 */
router.post('/', (req, res, next) => {
  // If user is reporting back, skip to next.
  if (req.signup.draft_reportback_submission) {
    return next();
  }

  if (helpers.isCommand(req.incoming_message, 'reportback')) {
    return req.signup.createDraftReportbackSubmission()
      .then(() => replyDispatcher.execute(replies.askQuantity({ req, res })))
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  // If member has completed this campaign:
  if (req.signup.reportback) {
    if (req.isNewConversation) {
      return replyDispatcher.execute(replies.menuCompleted({ req, res }));
    }
    // Otherwise member didn't text back a Reportback or Member Support command.
    return replyDispatcher.execute(replies.invalidCmdCompleted({ req, res }));
  }

  if (req.isNewConversation) {
    return replyDispatcher.execute(replies.menuSignedUp({ req, res }));
  }

  return replyDispatcher.execute(replies.invalidCmdSignedup({ req, res }));
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
      return replyDispatcher.execute(replies.askQuantity({ req, res }));
    }
    if (!helpers.isValidReportbackQuantity(input)) {
      return replyDispatcher.execute(replies.invalidQuantity({ req, res }));
    }

    draft.quantity = Number(input);

    return draft.save()
      .then(() => replyDispatcher.execute(replies.askPhoto({ req, res })))
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  if (!draft.photo) {
    if (req.isNewConversation) {
      return replyDispatcher.execute(replies.askPhoto({ req, res }));
    }
    if (!req.incoming_image_url) {
      return replyDispatcher.execute(replies.noPhotoSent({ req, res }));
    }

    draft.photo = req.incoming_image_url;

    return draft.save()
      .then(() => replyDispatcher.execute(replies.askCaption({ req, res })))
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  if (!draft.caption) {
    if (req.isNewConversation) {
      return replyDispatcher.execute(replies.askCaption({ req, res }));
    }
    if (!helpers.isValidReportbackText(input)) {
      return replyDispatcher.execute(replies.invalidCaption({ req, res }));
    }

    draft.caption = helpers.trimReportbackText(input);

    return draft.save()
      .then(() => {
        // If member hasn't submitted a reportback yet, ask for why_participated.
        if (!req.signup.total_quantity_submitted) {
          return replyDispatcher.execute(replies.askWhyParticipated({ req, res }));
        }

        // Otherwise skip to post reportback to DS API.
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  if (!draft.why_participated) {
    if (req.isNewConversation) {
      return replyDispatcher.execute(replies.askWhyParticipated({ req, res }));
    }
    if (!helpers.isValidReportbackText(input)) {
      return replyDispatcher.execute(replies.invalidWhyParticipated({ req, res }));
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

      return replyDispatcher.execute(replies.menuCompleted({ req, res }));
    })
    .catch(err => helpers.handlePhoenixPostError(req, res, err));
});

module.exports = router;
