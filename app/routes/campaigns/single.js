'use strict';

const express = require('express');


const getCampaignMiddleware = require('../../../lib/middleware/campaigns/single/campaign-get');

const router = express.Router({ mergeParams: true });

router.use(getCampaignMiddleware());

module.exports = router;
