'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap

const helpers = require('../../lib/helpers');
const mobilecommons = rootRequire('lib/mobilecommons');
const logger = app.locals.logger;
const stathat = app.locals.stathat;

/**
 * GET index of campaigns.
 */
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
    .catch(error => helpers.sendResponse(res, 500, error.message));
});

/**
 * GET single campaign.
 */
router.get('/:id', (req, res) => {
  stathat('route: v1/campaigns/{id}');
  const campaignId = req.params.id;
  logger.debug(`get campaign ${campaignId}`);

  return app.locals.db.campaigns
    .findById(campaignId)
    .exec()
    .then(campaign => {
      if (!campaign) {
        return helpers.sendResponse(res, 404, `Campaign ${campaignId} found`);
      }
      const data = campaign.formatApiResponse();

      return res.send({ data });
    })
    .catch(error => helpers.sendResponse(res, 500, error.message));
});

/**
 * Sends SMS message to given phone number with the given Campaign and its message type.
 */
router.post('/:id/message', (req, res) => {
  // Check required parameters.
  const campaignId = req.params.id;
  const phone = req.body.phone;
  const type = req.body.type;

  if (!campaignId) {
    return helpers.sendResponse(res, 422, 'Missing required campaign id.');
  }
  if (!phone) {
    return helpers.sendResponse(res, 422, 'Missing required phone parameter.');
  }
  if (!type) {
    return helpers.sendResponse(res, 422, 'Missing required message type parameter.');
  }

  // Check that campaign is active.
  // TODO: Refactor this to no longer use app.locals.campaigns -- would need to query Phoenix API
  // to check for Campaign Status.
  const campaign = app.locals.campaigns[campaignId];
  if (!campaign || campaign.status !== 'active') {
    const msg = `Campaign ${campaignId} is not running on CampaignBot`;
    return helpers.sendResponse(res, 422, msg);
  }

  // Check that campaign suports requested message type.
  const messageBody = campaign.messages[type];
  if (!messageBody) {
    const msg = `Campaign ${campaignId} does not support '${type}' messages`;
    return helpers.sendResponse(res, 422, msg);
  }

  return app.locals.clients.northstar.Users.get('mobile', phone)
  .then((user) => {
    mobilecommons.send_message(phone, messageBody);
    const msg = `Sent text for ${campaignId} ${type} to ${user.mobile}`;
    logger.info(msg);
    stathat('Sent campaign message');
    return helpers.sendResponse(res, 200, msg);
  })
  .catch((err) => {
    if (err.response) {
      logger.error(err.response.error);
    }
    const msg = `Error sending text to user #${phone}: ${err.message}`;
    return helpers.sendResponse(res, 500, msg);
  });
});

module.exports = router;
