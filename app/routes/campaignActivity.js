'use strict';

const express = require('express');

// configs
const requiredParamsConf = require('../../config/lib/middleware/campaignActivity/required-params');
const mapParamsConf = require('../../config/lib/middleware/campaignActivity/map-request-params');

// Middleware
const requiredParamsMiddleware = require('../../lib/middleware/required-params');
const mapRequestParamsMiddleware = require('../../lib/middleware/campaignActivity/map-request-params');
const getSignupMiddleware = require('../../lib/middleware/campaignActivity/signup-get');
const createNewSignupIfNotFoundMiddleware = require('../../lib/middleware/campaignActivity/signup-create');
const validateRequestMiddleware = require('../../lib/middleware/campaignActivity/validate');
const textPostMiddleware = require('../../lib/middleware/campaignActivity/text-post');
const createDraftSubmissionMiddleware = require('../../lib/middleware/campaignActivity/draft-create');
const completedMenuMiddleware = require('../../lib/middleware/campaignActivity/menu-completed');
const doingMenuMiddleware = require('../../lib/middleware/campaignActivity/menu-doing');
const draftSubmissionQuantityMiddleware = require('../../lib/middleware/campaignActivity/draft-quantity');
const draftSubmissionPhotoMiddleware = require('../../lib/middleware/campaignActivity/draft-photo');
const draftSubmissionCaptionMiddleware = require('../../lib/middleware/campaignActivity/draft-caption');
const draftSubmissionWhyParticipatedMiddleware = require('../../lib/middleware/campaignActivity/draft-why-participated');
const postDraftSubmissionMiddleware = require('../../lib/middleware/campaignActivity/draft-completed');

// Router
const router = express.Router(); // eslint-disable-line new-cap

/**
 * Check for required parameters,
 * parse incoming params, and add/log helper variables.
 */
router.use(requiredParamsMiddleware(requiredParamsConf));
router.use(mapRequestParamsMiddleware(mapParamsConf));

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
 * Create a text post if this is a text postType request.
 */
router.use(textPostMiddleware());

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
