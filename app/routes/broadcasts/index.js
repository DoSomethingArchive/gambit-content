'use strict';

const express = require('express');

const getBroadcastsMiddleware = require('../../../lib/middleware/broadcasts/index/broadcasts-get');

const router = express.Router();

router.use(getBroadcastsMiddleware());

module.exports = router;
