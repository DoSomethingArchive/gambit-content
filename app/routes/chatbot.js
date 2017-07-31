'use strict';

const express = require('express');

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
const sendSignupMenuIfDraftNotFoundMiddleware = require('../../lib/middleware/signup-menu');
const draftSubmissionQuantityMiddleware = require('../../lib/middleware/draft-quantity');
const draftSubmissionPhotoMiddleware = require('../../lib/middleware/draft-photo');
const draftSubmissionCaptionMiddleware = require('../../lib/middleware/draft-caption');
const draftSubmissionWhyParticipatedMiddleware = require('../../lib/middleware/draft-why-participated');

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
router.use(sendSignupMenuIfDraftNotFoundMiddleware());

/**
 * Collect data for our Reportback Submission.
 */
router.use(draftSubmissionQuantityMiddleware());
router.use(draftSubmissionPhotoMiddleware());
router.use(draftSubmissionCaptionMiddleware());
router.use(draftSubmissionWhyParticipatedMiddleware());

/**
 * Post complete submission to the DS Phoenix API.
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
