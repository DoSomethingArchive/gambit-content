'use strict';

/**
 * API Wrapper for the Gambit Groups API.
 */

const superagent = require('superagent');
const logger = app.locals.logger;

const uri = process.env.MESSAGING_GROUPS_API_URI;
const apiKey = process.env.MESSAGING_GROUPS_API_URI;
const apiHeaderName = 'x-messaging-group-api-key';

module.exports = {
  /**
   * Make a GET request to Gambit Groups API.
   * Handles authentication & URL formation.
   * @param  {string} path API Path. eg: /group
   * @return {Promise}
   */
  get: function (path) {
    return superagent.get(`${uri}${path}`)
      .set(apiHeaderName, apiKey)
      .then(res => res.body)
      .catch(error => logger.error(error));
  },

  /**
   * Make a post request to Gambit Groups API.
   * Handles authentication & URL formation.
   * @param  {string} path API Path. eg: /group
   * @param  {object} data JSON data to send.
   * @return {Promise}
   */
  post: function (path, data) {
    return superagent.post(`${uri}${path}`)
      .send(data)
      .set(apiHeaderName, apiKey)
      .then(res => res.body)
      .catch(error => logger.error(error));
  },

  /**
   * Find the group for the given campaign ID & run ID.
   * @param  {int} campaignId    Campaign ID to search for.
   * @param  {int} campaignRunId Campaign Run ID to search for.
   * @return {Promise}
   */
  findGroup: function(campaignId, campaignRunId) {
    return this.get(`/group/${campaignId}/${campaignRunId}`);
  },

  /**
   * Create a group for the given campaign ID & run ID.
   * @param  {int} campaignId    Campaign ID to create a group for.
   * @param  {ibt} campaignRunId Campaign Run ID to create a group for.
   * @return {Promise}
   */
  createGroup: function(campaignId, campaignRunId) {
    return this.post('/group', {
      campaign_id: campaignId,
      campaign_run_id: campaignRunId
    });
  },
}
