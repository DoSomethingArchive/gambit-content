'use strict';

const express = require('express');

// Middleware;
const getCampaignMiddleware = require('../../../lib/middleware/campaigns/single/campaign-get');
const getKeywordsMiddleware = require('../../../lib/middleware/campaigns/single/keywords-get');
const getTopicsMiddleware = require('../../../lib/middleware/campaigns/single/topics-get');
const sendResponseMiddleware = require('../../../lib/middleware/campaigns/single/response');

const router = express.Router({ mergeParams: true });

router.use(getCampaignMiddleware());
router.use(getKeywordsMiddleware());
router.use(getTopicsMiddleware());
router.use(sendResponseMiddleware());

module.exports = router;
