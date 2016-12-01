'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const mobilecommons = rootRequire('lib/mobilecommons');
const logger = app.locals.logger;
const stathat = app.locals.stathat;

router.post('/reminder', (req, res) => {
  const northstarUserId = req.body.northstarUserId;
  const campaignId = req.body.campaignId;
  const reminderType = req.body.reminderType;

  if (!northstarUserId || !campaignId || !reminderType) {
    res.json({ error: 'Missing parameters' });
    return;
  }

  if (!app.locals.campaigns[campaignId]) {
    res.json({ error: 'No campaign set in Gambit for the given campaign id.' });
    return;
  }

  app.locals.clients.northstar.Users
  .get('id', northstarUserId)
  .then((nsUser) => { // eslint-disable-line consistent-return
    const mobile = nsUser.mobile;
    if (!mobile) return res.json({ error: 'No mobile number for NS user.' });

    const reminderParam = `msg_relative_reminder_${reminderType}`;
    const reminderMessage = app.locals.campaigns[campaignId][reminderParam];
    if (!reminderMessage) return res.json({ error: 'No reminder set for campaign.' });

    mobilecommons.send_message(mobile, reminderMessage);
    stathat('Sent relative reminder');
    res.json({ success: true });
  })
  .catch((err) => {
    logger.error('Error sending reminder message', err.message);
  });
});

module.exports = router;
