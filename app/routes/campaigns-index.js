'use strict';

const express = require('express');

// Middleware
const contentfulKeywordsMiddleware = require('../../lib/middleware/campaigns-index/contentful-keywords');
const parseKeywordsMiddleware = require('../../lib/middleware/campaigns-index/parse-keywords');
const getPhoenixCampaignsMiddleware = require('../../lib/middleware/campaigns-index/phoenix-campaigns');
const formatCampaignsMiddleware = require('../../lib/middleware/campaigns-index/format-campaigns');
const mobileCommonsGroupsMiddleware = require('../../lib/middleware/campaigns-index/mobilecommons-groups');

const router = express.Router(); // eslint-disable-line new-cap

router.use(contentfulKeywordsMiddleware());
router.use(parseKeywordsMiddleware());
router.use(getPhoenixCampaignsMiddleware());
router.use(formatCampaignsMiddleware());
router.use(mobileCommonsGroupsMiddleware());

module.exports = router;
