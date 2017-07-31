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
const createDraftSubmissionMiddleware = require('../../lib/middleware/draft-create');
const sendSignupMenuMiddleware = require('../../lib/middleware/send-signup-menu');

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
 * Conversation Processing
 */

router.use(

  /**
   * If the user texts the support command we will process this request here
   */
  processUserSupportConversationMiddleware());

/**
 * Checks Signup for existing draft, or creates draft when User has completed the Campaign.
 */
router.use(createDraftSubmissionMiddleware());

/**
 * If there's no Draft, send the Signup Menus.
 */
router.use(sendSignupMenuMiddleware());

/**
 * Find message type to reply with based on current Reportback Submission and data submitted in req.
 */
router.post('/', (req, res, next) => {
  const draft = req.signup.draft_reportback_submission;
  const input = req.incoming_message;
  logger.debug(`draft_reportback_submission:${draft._id}`);

  if (!draft.quantity) {
    if (req.isNewConversation) {
      return ReplyDispatcher.execute(replies.askQuantity({ req, res }));
    }
    if (!helpers.isValidReportbackQuantity(input)) {
      return ReplyDispatcher.execute(replies.invalidQuantity({ req, res }));
    }

    draft.quantity = Number(input);

    return draft.save()
      .then(() => ReplyDispatcher.execute(replies.askPhoto({ req, res })))
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  if (!draft.photo) {
    if (req.isNewConversation) {
      return ReplyDispatcher.execute(replies.askPhoto({ req, res }));
    }
    if (!req.incoming_image_url) {
      return ReplyDispatcher.execute(replies.noPhotoSent({ req, res }));
    }

    draft.photo = req.incoming_image_url;

    return draft.save()
      .then(() => ReplyDispatcher.execute(replies.askCaption({ req, res })))
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  if (!draft.caption) {
    if (req.isNewConversation) {
      return ReplyDispatcher.execute(replies.askCaption({ req, res }));
    }
    if (!helpers.isValidReportbackText(input)) {
      return ReplyDispatcher.execute(replies.invalidCaption({ req, res }));
    }

    draft.caption = helpers.trimReportbackText(input);

    return draft.save()
      .then(() => {
        // If member hasn't submitted a reportback yet, ask for why_participated.
        if (!req.signup.total_quantity_submitted) {
          return ReplyDispatcher.execute(replies.askWhyParticipated({ req, res }));
        }

        // Otherwise skip to post reportback to DS API.
        return next();
      })
      .catch(err => helpers.sendErrorResponse(res, err));
  }

  if (!draft.why_participated) {
    if (req.isNewConversation) {
      return ReplyDispatcher.execute(replies.askWhyParticipated({ req, res }));
    }
    if (!helpers.isValidReportbackText(input)) {
      return ReplyDispatcher.execute(replies.invalidWhyParticipated({ req, res }));
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

      return ReplyDispatcher.execute(replies.menuCompleted({ req, res }));
    })
    .catch(err => helpers.handlePhoenixPostError(req, res, err));
});

module.exports = router;
