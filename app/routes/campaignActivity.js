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
const parseStartPhotoPostMiddleware = require('../../lib/middleware/campaignActivity/photo/draft-create');
const photoPostAutoReplyMiddleware = require('../../lib/middleware/campaignActivity/photo/auto-reply');
const photoPostQuantityMiddleware = require('../../lib/middleware/campaignActivity/photo/draft-quantity');
const photoPostPhotoMiddleware = require('../../lib/middleware/campaignActivity/photo/draft-photo');
const photoPostCaptionMiddleware = require('../../lib/middleware/campaignActivity/photo/draft-caption');
const photoPostWhyParticipatedMiddleware = require('../../lib/middleware/campaignActivity/photo/draft-why-participated');
const createPhotoPostMiddleware = require('../../lib/middleware/campaignActivity/photo/post-create');

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
 * Submits a Text Post for requests with postType text.
 */
router.use(createTextPostMiddleware());

/**
 * Check if we're beginning or continuing a Photo Post.
 */
router.use(parseStartPhotoPostMiddleware());

/**
 * If a Photo Post is not in progress, send auto replies.
 */
router.use(photoPostAutoReplyMiddleware());

/**
 * Collect data for a Photo Post.
 */
router.use(photoPostQuantityMiddleware());
router.use(photoPostPhotoMiddleware());
router.use(photoPostCaptionMiddleware());
router.use(photoPostWhyParticipatedMiddleware());

/**
 * Submits completed draft as a Photo Post to Rogue.
 */
router.use(createPhotoPostMiddleware());

module.exports = router;
