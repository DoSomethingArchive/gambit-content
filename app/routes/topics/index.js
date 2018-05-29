'use strict';

const express = require('express');

const getTopicsMiddleware = require('../../../lib/middleware/topics/index/topics-get');

const router = express.Router({ mergeParams: true });

router.use(getTopicsMiddleware());

module.exports = router;
