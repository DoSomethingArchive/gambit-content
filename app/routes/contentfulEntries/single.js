'use strict';

const express = require('express');

const getContentfulEntryMiddleware = require('../../../lib/middleware/contentfulEntries/single/contentfulEntry-get.js');

const router = express.Router({ mergeParams: true });

router.use(getContentfulEntryMiddleware());

module.exports = router;
