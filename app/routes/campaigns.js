'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap

const helpers = require('../../lib/helpers');
const mobilecommons = rootRequire('lib/mobilecommons');
const logger = app.locals.logger;
const stathat = app.locals.stathat;

router.get('/', (req, res) => {
  stathat('route: v1/campaigns');

  const findClause = {};
  if (req.query.campaignbot) {
    const campaignConfigVar = process.env.CAMPAIGNBOT_CAMPAIGNS;
    const campaignIDs = campaignConfigVar.split(',').map(id => Number(id));
    findClause._id = { $in: campaignIDs };
  }

  return app.locals.db.campaigns
    .find(findClause)
    .exec()
    .then((campaigns) => {
      const data = campaigns.map(campaign => campaign.formatApiResponse());
      res.send({ data });
    })
    .catch(error => res.send(error));
});

router.get('/:id', (req, res) => {
  stathat('route: v1/campaigns/{id}');
  logger.debug(`get campaign ${req.params.id}`);

  return app.locals.db.campaigns
    .findById(req.params.id)
    .exec()
    .then(campaign => {
      if (!campaign) {
        return res.sendStatus(404);
      }
      const data = campaign.formatApiResponse();

      return res.send({ data });
    })
    .catch(error => res.send(error));
});

router.post('/:id/message', (req, res) => {
  // Check required parameters.
  const campaignId = req.params.id;
  const mobile = req.body.mobile;
  const type = req.body.type;

  if (!mobile) {
    return helpers.sendResponse(res, 422, 'Missing required mobile parameter.');
  }
  if (!campaignId) {
    return helpers.sendResponse(res, 422, 'Missing required campaign parameter.');
  }
  if (!type) {
    return helpers.sendResponse(res, 422, 'Missing required message type parameter.');
  }

  // Check that campaign is active.
  const campaign = app.locals.campaigns[campaignId];
  if (!campaign || campaign.status !== 'active') {
    const msg = `Campaign ${campaignId} is not running on CampaignBot`;
    return helpers.sendResponse(res, 422, msg);
  }

  // Check that campaign suports requested message type.
  const messageBody = campaign.messages[type];
  if (!messageBody) {
    const msg = `Campaign ${campaignId} does not support reminders for '${type}'`;
    return helpers.sendResponse(res, 422, msg);
  }

  return app.locals.clients.northstar.Users.get('mobile', mobile)
  .then((user) => {
    mobilecommons.send_message(mobile, messageBody);
    const msg = `Sent text for ${campaignId} ${type} to ${user.mobile}`;
    logger.info(msg);
    stathat('Sent campaign message');
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
