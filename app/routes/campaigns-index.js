'use strict';

const express = require('express');

// Middleware
const contentfulKeywordsMiddleware = require('../../lib/middleware/campaigns-index/contentful-keywords');
const parseKeywordsMiddleware = require('../../lib/middleware/campaigns-index/parse-keywords');
const pheonixCampaignsMiddleware = require('../../lib/middleware/campaigns-index/phoenix-campaigns');

const router = express.Router(); // eslint-disable-line new-cap

router.use(contentfulKeywordsMiddleware());
router.use(parseKeywordsMiddleware());
router.use(pheonixCampaignsMiddleware());

module.exports = router;
