'use strict';

const express = require('express');

const defaultTopicTriggersMiddleware = require('../../../lib/middleware/defaultTopicTriggers/index/defaultTopicTriggers-get');

const router = express.Router();

router.use(defaultTopicTriggersMiddleware());

module.exports = router;
