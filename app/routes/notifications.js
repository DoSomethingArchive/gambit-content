'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap

router.post('/', (req, res) => {
  const northstarUserId = req.body.northstarUserId;
  const message = req.body.message;
  const northstar = app.locals.clients.northstar;

  if (!northstarUserId || !message) {
    res.json({error: 'Missing parameters'});
    return;
  }

  northstar.Users.get('id', northstarUserId).then(console.log);

});

module.exports = router;
