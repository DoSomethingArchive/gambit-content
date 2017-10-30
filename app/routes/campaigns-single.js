'use strict';

const express = require('express');

// Middleware;
const getPhoenixCampaignMiddleware = require('../../lib/middleware/campaigns-single/phoenix-campaign');
const getContentfulKeywordsMiddleware = require('../../lib/middleware/campaigns-single/contentful-keywords');
const getContentfulCampaignsMiddleware = require('../../lib/middleware/campaigns-single/contentful-campaigns');
const renderTemplatesMiddleware = require('../../lib/middleware/campaigns-single/render-templates');

const router = express.Router({ mergeParams: true });

router.use(getPhoenixCampaignMiddleware());
router.use(getContentfulKeywordsMiddleware());
router.use(getContentfulCampaignsMiddleware());
router.use(renderTemplatesMiddleware());

module.exports = router;
