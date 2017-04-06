'use strict';

/**
 * API Wrapper for the Messaging Groups API.
 */

const superagent = require('superagent');
const logger = app.locals.logger;

const uri = process.env.DS_MESSAGING_GROUPS_API_BASEURI;
const apiKey = process.env.DS_MESSAGING_GROUPS_API_KEY;
const apiHeaderName = 'x-messaging-group-api-key';

if (!uri || !apiKey) {
  logger.error('Missing DS Messaging Groups API config vars');
}

module.exports = {
  /**
   * Gets the Mobile Commons groups for the given DS Campaign ID & Run ID.
   * @param {int} campaignId - Campaign ID to search for.
   * @param {int} campaignRunId - Campaign Run ID to search for.
   * @return {Promise}
   */
  getGroups(campaignId, campaignRunId) {
    logger.debug(`groups.getGroups campaign:${campaignId} run:${campaignRunId}`);

    return superagent
      .get(`${uri}/mobilecommons-groups`)
      .set(apiHeaderName, apiKey)
      .query({
        campaign_id: campaignId,
        campaign_run_id: campaignRunId,
        environment: process.env.NODE_ENV,
      });
  },
};
