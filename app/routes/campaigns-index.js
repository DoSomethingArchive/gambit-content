'use strict';

const express = require('express');

// Middleware
const contentfulKeywordsMiddleware = require('../../lib/middleware/campaigns-index/contentful-keywords');
const parseKeywordsMiddleware = require('../../lib/middleware/campaigns-index/parse-keywords');
const getPhoenixCampaignsMiddleware = require('../../lib/middleware/campaigns-index/phoenix-campaigns');
const parseCampaignsMiddleware = require('../../lib/middleware/campaigns-index/parse-phoenix-campaigns');
const mobileCommonsGroupsMiddleware = require('../../lib/middleware/campaigns-index/mobilecommons-groups');

const router = express.Router(); // eslint-disable-line new-cap

router.use(contentfulKeywordsMiddleware());
router.use(parseKeywordsMiddleware());
router.use(getPhoenixCampaignsMiddleware());
router.use(parseCampaignsMiddleware());
router.use(mobileCommonsGroupsMiddleware());

module.exports = router;
