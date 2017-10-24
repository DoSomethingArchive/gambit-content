'use strict';

const Promise = require('bluebird');
const logger = require('winston');
const groups = require('../../groups');
const helpers = require('../../helpers');

function getGroupsForPhoenixCampaign(campaign) {
  return groups.getGroups(campaign.id, campaign.currentCampaignRun.id)
    .then((res) => {
      const groupsResponse = res.body.data;
      const scope = campaign;
      if (!groupsResponse) {
        logger.warn(`Error returning Messaging Groups API response for id ${campaign.id}.`);
        scope.mobilecommons_group_doing = null;
        scope.mobilecommons_group_completed = null;
        return scope;
      }

      scope.mobilecommons_group_doing = groupsResponse.doing.id;
      scope.mobilecommons_group_completed = groupsResponse.completed.id;
      return scope;
    });
}

module.exports = function getMobileCommonsGroups() {
  return (req, res) => {
    Promise.map(req.data, getGroupsForPhoenixCampaign)
      .then(data => res.send({ data }))
      .catch(err => helpers.sendErrorResponse(res, err));
  };
};
