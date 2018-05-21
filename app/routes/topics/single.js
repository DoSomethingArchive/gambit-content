'use strict';

const express = require('express');

// Middleware;
const getTopicMiddleware = require('../../../lib/middleware/topics/single/topic-get');
const getCampaignMiddleware = require('../../../lib/middleware/topics/single/campaign-get');
const renderTemplatesMiddleware = require('../../../lib/middleware/topics/single/templates-render');

const router = express.Router({ mergeParams: true });

router.use(getTopicMiddleware());
router.use(getCampaignMiddleware());
router.use(renderTemplatesMiddleware());

module.exports = router;
