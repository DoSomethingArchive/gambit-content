'use strict';

const express = require('express');

const getContentfulEntriesMiddleware = require('../../../lib/middleware/contentfulEntries/index/contentfulEntries-get');

const router = express.Router();

router.use(getContentfulEntriesMiddleware());

module.exports = router;
