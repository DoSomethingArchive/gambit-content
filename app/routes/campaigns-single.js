'use strict';

const express = require('express');

// Middleware;
const getCampaignMiddleware = require('../../lib/middleware/campaigns-single/campaign');
const getKeywordsMiddleware = require('../../lib/middleware/campaigns-single/keywords');
const getBotConfigMiddleware = require('../../lib/middleware/campaigns-single/bot-config');
const renderTemplatesMiddleware = require('../../lib/middleware/campaigns-single/render-templates');

const router = express.Router({ mergeParams: true });

router.use(getCampaignMiddleware());
router.use(getKeywordsMiddleware());
router.use(getBotConfigMiddleware());
router.use(renderTemplatesMiddleware());

module.exports = router;
