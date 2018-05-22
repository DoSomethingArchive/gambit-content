'use strict';

const express = require('express');

const defaultTopicTriggersMiddleware = require('../../lib/middleware/defaultTopicTriggers');

const router = express.Router({ mergeParams: true });

router.use(defaultTopicTriggersMiddleware());

module.exports = router;
