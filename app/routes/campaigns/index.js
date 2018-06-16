'use strict';

const express = require('express');

// Middleware
const getDefaultTopicTriggersMiddleware = require('../../../lib/middleware/campaigns/index/defaultTopicTriggers-get');
const sendResponseMiddleware = require('../../../lib/middleware/campaigns/index/response');

const router = express.Router(); // eslint-disable-line new-cap

router.use(getDefaultTopicTriggersMiddleware());
router.use(sendResponseMiddleware());

module.exports = router;
