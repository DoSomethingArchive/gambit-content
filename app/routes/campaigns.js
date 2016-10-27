'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap

router.get('/', (req, res) => {
  const findClause = {};
  if (req.query.campaignbot) {
    const campaignConfigVar = process.env.CAMPAIGNBOT_CAMPAIGNS;
    const campaignIDs = campaignConfigVar.split(',').map(id => Number(id));
    findClause._id = { $in: campaignIDs };
  }

  return app.locals.db.campaigns
    .find(findClause)
    .exec()
    .then(campaigns => res.send({ data: campaigns }))
    .catch(error => res.send(error));
});

router.get('/:id', (req, res) => {
  app.locals.logger.debug(`get campaign ${req.params.id}`);

  return app.locals.db.campaigns
    .findById(req.params.id)
    .exec()
    .then(campaign => {
      if (!campaign) {
        return res.sendStatus(404);
      }

      return res.send({ data: campaign });
    })
    .catch(error => res.send(error));
});

module.exports = router;
