'use strict';

const express = require('express');
const stathat = require('stathat');

const router = express.Router();

router.get('/', (req, res) => {
  stathat.postStat('route: /');
  return res.send('hi');
});

module.exports = router;
