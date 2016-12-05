'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const helpers = require('../../lib/helpers');
const mobilecommons = rootRequire('lib/mobilecommons');
const logger = app.locals.logger;
const stathat = app.locals.stathat;

const allowedTypes = ['signup', 'reportback'];

router.post('/reminder', (req, res) => {
  // Check required parameters.
  const mobile = req.body.mobile;
  const campaignID = req.body.campaign;
  const type = req.body.type;

  if (!mobile) {
    return helpers.sendResponse(res, 422, 'Missing required mobile parameter.');
  }
  if (!campaignID) {
    return helpers.sendResponse(res, 422, 'Missing required campaign parameter.');
  }
  if (!type) {
    return helpers.sendResponse(res, 422, 'Missing required message type parameter.');
  }

  // Check allowed message types.
  if (allowedTypes.indexOf(type) === -1) {
    const msg = `Reminder type should be one of: ${allowedTypes}, got: ${type}`;
    return helpers.sendResponse(res, 422, msg);
  }

  // Check that campaign is active.
  const campaign = app.locals.campaigns[campaignID];
  if (!campaign || campaign.status !== 'active') {
    const msg = `Campaign ${campaignID} is not running on CampaignBot`;
    return helpers.sendResponse(res, 422, msg);
  }

  // Check that campaign suports requested message type.
  const messageBody = campaign.messages[type];
  if (!messageBody) {
    const msg = `Campaign ${campaignID} does not support reminders for '${type}'`;
    return helpers.sendResponse(res, 422, msg);
  }

  return app.locals.clients.northstar.Users.get('mobile', mobile)
  .then((user) => {
    mobilecommons.send_message(mobile, messageBody);
    const msg = `Sent text for ${campaignID} ${type} to ${user.mobile}`;
    logger.info(msg);
    stathat('Sent relative text');
    return res.json({ success: true });
  })
  .catch((err) => {
    if (err.response) {
      logger.error(err.response.error);
    }
    const msg = `Error sending text to user #${mobile}: ${err.message}`;
    return helpers.sendResponse(res, 500, msg);
  });
});

module.exports = router;
