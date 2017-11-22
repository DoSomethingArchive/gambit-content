'use strict';

const express = require('express');

// configs
const requiredParamsConf = require('../../config/middleware/receive-message/required-params');
const mapParamsConf = require('../../config/middleware/receive-message/map-request-params');

// Middleware
const requiredParamsMiddleware = require('../../lib/middleware/required-params');
const mapRequestParamsMiddleware = require('../../lib/middleware/receive-message/map-request-params');
const getPhoenixCampaignMiddleware = require('../../lib/middleware/receive-message/phoenix-campaign-get');
const getSignupMiddleware = require('../../lib/middleware/receive-message/signup-get');
const createNewSignupIfNotFoundMiddleware = require('../../lib/middleware/receive-message/signup-create');
const validateRequestMiddleware = require('../../lib/middleware/receive-message/validate');
const createDraftSubmissionMiddleware = require('../../lib/middleware/receive-message/draft-create');
const completedMenuMiddleware = require('../../lib/middleware/receive-message/menu-completed');
const doingMenuMiddleware = require('../../lib/middleware/receive-message/menu-doing');
const draftSubmissionQuantityMiddleware = require('../../lib/middleware/receive-message/draft-quantity');
const draftSubmissionPhotoMiddleware = require('../../lib/middleware/receive-message/draft-photo');
const draftSubmissionCaptionMiddleware = require('../../lib/middleware/receive-message/draft-caption');
const draftSubmissionWhyParticipatedMiddleware = require('../../lib/middleware/receive-message/draft-why-participated');
const postDraftSubmissionMiddleware = require('../../lib/middleware/receive-message/draft-completed');

// Router
const router = express.Router(); // eslint-disable-line new-cap

/**
 * Check for required parameters,
 * parse incoming params, and add/log helper variables.
 */
router.use(requiredParamsMiddleware(requiredParamsConf));
router.use(mapRequestParamsMiddleware(mapParamsConf));

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
 * Checks Signup for existing draft, or creates draft when User has completed the Campaign.
 */
router.use(createDraftSubmissionMiddleware());

/**
 * If there's no Draft, send the relevant Menus.
 */
router.use(completedMenuMiddleware());
router.use(doingMenuMiddleware());

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
router.use(postDraftSubmissionMiddleware());

module.exports = router;
