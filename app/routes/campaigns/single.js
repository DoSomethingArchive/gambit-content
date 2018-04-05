'use strict';

const express = require('express');

// Middleware;
const getCampaignMiddleware = require('../../../lib/middleware/campaigns/single/campaign-get');
const getKeywordsMiddleware = require('../../../lib/middleware/campaigns/single/keywords-get');
const getBotConfigMiddleware = require('../../../lib/middleware/campaigns/single/bot-config-get');
const parseBotConfigMiddleware = require('../../../lib/middleware/campaigns/single/bot-config-parse');

const router = express.Router({ mergeParams: true });

router.use(getCampaignMiddleware());
router.use(getKeywordsMiddleware());
router.use(getBotConfigMiddleware());
router.use(parseBotConfigMiddleware());

module.exports = router;
