'use strict';

const express = require('express');

const getTopicsMiddleware = require('../../../lib/middleware/topics/index');

const router = express.Router({ mergeParams: true });

router.use(getTopicsMiddleware());

module.exports = router;
