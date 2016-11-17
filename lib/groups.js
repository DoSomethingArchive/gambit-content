'use strict';

const Promise = require('bluebird');

/**
 * API Wrapper for the Gambit Groups API.
 */

const superagent = require('superagent');
const logger = app.locals.logger;

const uri = process.env.DS_MESSAGING_GROUPS_API_BASEURI;
const apiKey = process.env.DS_MESSAGING_GROUPS_API_KEY;
const apiHeaderName = 'x-messaging-group-api-key';
const environment = process.env.NODE_ENV;

if (!uri || !apiKey) {
  logger.error('Missing DS Messaging config vars');
}

module.exports = {
  /**
   * Make a GET request to Gambit Groups API.
   * Handles authentication & URL formation.
   * @param  {string} path API Path. eg: /group
   * @return {Promise}
   */
  get(path) {
    return superagent.get(`${uri}${path}`)
      .set(apiHeaderName, apiKey)
      .then(this.parseGroupOutput)
      .catch((error) => {
        logger.warn(`Messaging groups GET caught an error: ${error.message}`);
      });
  },

  /**
   * Make a post request to Gambit Groups API.
   * Handles authentication & URL formation.
   * @param  {string} path API Path. eg: /group
   * @param  {object} data JSON data to send.
   * @return {Promise}
   */
  post(path, data) {
    return superagent.post(`${uri}${path}`)
      .send(data)
      .set(apiHeaderName, apiKey)
      .then(this.parseGroupOutput)
      .catch((error) => {
        logger.warn(`Messaging groups POST caught an error: ${error.message}`);
      });
  },

  /**
   * Find the group for the given campaign ID & run ID.
   * @param  {int} campaignId    Campaign ID to search for.
   * @param  {int} campaignRunId Campaign Run ID to search for.
   * @return {Promise}
   */
  findGroup(campaignId, campaignRunId) {
    return this.get(`/group/${campaignId}/${campaignRunId}`);
  },

  /**
   * Create a group for the given campaign ID & run ID.
   * @param  {int} campaignId    Campaign ID to create a group for.
   * @param  {int} campaignRunId Campaign Run ID to create a group for.
   * @return {Promise}
   */
  createGroup(campaignId, campaignRunId) {
    return this.post('/group', {
      campaign_id: campaignId,
      campaign_run_id: campaignRunId,
    });
  },

  /**
   * Returns messaging groups for the given campaign,
   * create them when they don't exist.
   *
   * @param  {int} campaignId    Campaign ID to create a group for.
   * @param  {int} campaignRunId Campaign Run ID to create a group for.
   * @return {Promise}
   */
  findOrCreateGroup(campaignId, campaignRunId) {
    return new Promise((resolve, reject) => {
      // Check if groups already exist on Mobile commons:
      this.findGroup(campaignId, campaignRunId)
        .then((groups) => {
          const message = 'Messaging Groups found: '
             + `campaign ${campaignId} run ${campaignRunId}:`
             + ` ${groups.doing} / ${groups.completed}`;
          logger.info(message);
          resolve(groups);
        })
        .catch(() => {
          // Groups don't exist yet, let's create them.
          this.createGroup(campaignId, campaignRunId)
            .then((groups) => {
              const message = 'Messaging Groups created: '
                 + `campaign ${campaignId} run ${campaignRunId}:`
                 + ` ${groups.doing} / ${groups.completed}`;
              logger.info(message);
              resolve(groups);
            })
            .catch(error => reject(error));
        });
    });
  },

  /**
   * Parses messaging groups API output.
   *
   * @param  {json} response Api response.
   * @return {Promise}
   */
  parseGroupOutput(response) {
    return new Promise((resolve, reject) => {
      if (!response.body._id) {
        return reject('No _id in Messaging Groups API response');
      }

      if (!response.body.mobilecommons_groups[environment]) {
        return reject('No mobilecommons_groups in Messaging Groups API response.');
      }

      const doing = response.body.mobilecommons_groups[environment].doing;
      const completed = response.body.mobilecommons_groups[environment].completed;

      return resolve({ doing, completed });
    });
  },

};
