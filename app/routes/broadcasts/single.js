'use strict';

const express = require('express');

const getBroadcastMiddleware = require('../../../lib/middleware/broadcasts/single/broadcast-get');

const router = express.Router({ mergeParams: true });

router.use(getBroadcastMiddleware());

module.exports = router;
