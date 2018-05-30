'use strict';

const express = require('express');

const getTopicsMiddleware = require('../../../lib/middleware/topics/index/topics-get');

const router = express.Router();

router.use(getTopicsMiddleware());

module.exports = router;
