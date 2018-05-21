'use strict';

const express = require('express');

// Middleware;
const getTopicMiddleware = require('../../../lib/middleware/topics/single/topic-get');

const router = express.Router({ mergeParams: true });

router.use(getTopicMiddleware());

module.exports = router;
