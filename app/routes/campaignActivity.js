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
// Middleware for Text Posts.
const createTextPostMiddleware = require('../../lib/middleware/campaignActivity/text/post-create');
// Middleware for Photo Posts.
const doingMenuMiddleware = require('../../lib/middleware/campaignActivity/photo/menu-doing');
const createDraftSubmissionMiddleware = require('../../lib/middleware/campaignActivity/photo/draft-create');
const draftSubmissionQuantityMiddleware = require('../../lib/middleware/campaignActivity/photo/draft-quantity');
const draftSubmissionPhotoMiddleware = require('../../lib/middleware/campaignActivity/photo/draft-photo');
const draftSubmissionCaptionMiddleware = require('../../lib/middleware/campaignActivity/photo/draft-caption');
const draftSubmissionWhyParticipatedMiddleware = require('../../lib/middleware/campaignActivity/photo/draft-why-participated');
const createPhotoPostMiddleware = require('../../lib/middleware/campaignActivity/photo/post-create');
const completedMenuMiddleware = require('../../lib/middleware/campaignActivity/photo/menu-completed');

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
 * Submit a Text Post if request has postType text.
 */
router.use(createTextPostMiddleware());

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
 * Collect data for a Photo Post.
 */
router.use(draftSubmissionQuantityMiddleware());
router.use(draftSubmissionPhotoMiddleware());
router.use(draftSubmissionCaptionMiddleware());
router.use(draftSubmissionWhyParticipatedMiddleware());

/**
 * Submit a Photo Post.
 */
router.use(createPhotoPostMiddleware());

module.exports = router;
