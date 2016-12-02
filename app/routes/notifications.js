'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const helpers = require('../../lib/helpers');
const mobilecommons = rootRequire('lib/mobilecommons');
const logger = app.locals.logger;
const stathat = app.locals.stathat;

const allowedReminderTypes = ['signup', 'reportback'];

router.post('/reminder', (req, res) => {
  // Check required parameters.
  if (!req.body.mobile) {
    return helpers.sendResponse(res, 422, 'Missing required mobile parameter.');
  }
  if (!req.body.campaign_id) {
    return helpers.sendResponse(res, 422, 'Missing required campaign id parameter.');
  }
  if (!req.body.reminder_type) {
    return helpers.sendResponse(res, 422, 'Missing required reminder type parameter.');
  }

  const mobile = req.body.mobile;
  const campaignID = req.body.campaign_id;
  const reminderType = req.body.reminder_type;
  const reminderCampaignField = `msg_relative_reminder_${reminderType}`;

  // Check allowed reminder types.
  if (allowedReminderTypes.indexOf(reminderType) === -1) {
    const msg = `Reminder type should be one of: ${allowedReminderTypes}, got: ${reminderType}`;
    return helpers.sendResponse(res, 422, msg);
  }

  // Check that campaign is active.
  const campaign = app.locals.campaigns[campaignID];
  if (!campaign || campaign.status !== 'active') {
    const msg = `Campaign ${campaignID} is not running on CampaignBot`;
    return helpers.sendResponse(res, 422, msg);
  }

  // Check that campaign suports requested reminder type.
  const reminderMessage = campaign[reminderCampaignField];
  if (!reminderMessage) {
    const msg = `Campaign ${campaignID} does not support reminders for '${reminderType}'`;
    return helpers.sendResponse(res, 422, msg);
  }

  return app.locals.clients.northstar.Users.get('mobile', mobile)
  .then((user) => {
    mobilecommons.send_message(mobile, reminderMessage);
    const msg = `Sent reminder for ${campaignID} ${reminderType} to ${user.mobile}`;
    logger.info(msg);
    stathat('Sent relative reminder');
    return res.json({ success: true });
  })
  .catch((err) => {
    if (err.response) {
      logger.error(err.response.error);
    }
    const msg = `Error sending reminder to user #${mobile}: ${err.message}`;
    return helpers.sendResponse(res, 500, msg);
  });
});

module.exports = router;
