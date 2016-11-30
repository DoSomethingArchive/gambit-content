'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const mobilecommons = rootRequire('lib/mobilecommons');
const logger = app.locals.logger;
const stathat = app.locals.stathat;

router.post('/reminder', (req, res) => {
  const northstarUserId = req.body.northstarUserId;
  const campaignId = req.body.campaignId;

  if (!northstarUserId || !campaignId) {
    res.json({error: 'Missing parameters'});
    return;
  }

  app.locals.clients.northstar.Users
  .get('id', northstarUserId)
  .then(nsUser => nsUser.mobile)
  .then((mobile) => {
    if (!mobile) return res.json({error: 'No mobile number for NS user.'});

    const reminderMessage = app.locals.campaigns[campaignId].msg_relative_reminder;
    if (!reminderMessage) return res.json({error: 'No reminder set for campaign.'});

    mobilecommons.send_message(mobile, reminderMessage);
    res.json({success: true});
    stathat('Sent relative reminder');
  })
  .catch((err) => {
    logger.error('Error sending reminder message', err);
  });
});

module.exports = router;
