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
  logger.error('Missing DS Messaging Groups API config vars');
}

module.exports = {
  /**
   * Make a GET request to DS Messaging Groups API.
   * Handles authentication & URL formation.
   * @param  {string} path API Path. eg: /group
   * @return {Promise}
   */
  get(path) {
    return superagent.get(`${uri}${path}`)
      .set(apiHeaderName, apiKey)
      .then(this.parseGroupOutput)
      .catch((error) => {
        logger.warn(`groups.get error:${error.message}`);
      });
  },

  /**
   * Make a post request to DS Messaging Groups API.
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
        logger.warn(`groups.post error:${error.message}`);
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
    logger.debug(`groups.createGroup campaign:${campaignId} run:${campaignRunId}`);

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
    logger.debug(`groups.findOrCreateGroup campaign:${campaignId} run:${campaignRunId}`);

    return new Promise((resolve, reject) => {
      // Check if groups already exist on Mobile commons:
      this.findGroup(campaignId, campaignRunId)
        .then((groups) => {
          const message = 'groups.findOrCreateGroup found '
             + `campaign:${campaignId} run:${campaignRunId} groups:${JSON.stringify(groups)}`;
          logger.debug(message);
          resolve(groups);
        })
        .catch(() => {
          // TODO: This isn't checking for non 404 errors.
          // Groups don't exist yet, let's create them.
          this.createGroup(campaignId, campaignRunId)
            .then((groups) => {
              const message = 'groups.findOrCreateGroup created '
                + `campaign:${campaignId} run:${campaignRunId} groups:${JSON.stringify(groups)}`;
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
        return reject('groups.parseGroupOutput: _id undefined');
      }

      if (!response.body.mobilecommons_groups[environment]) {
        return reject('groups.parseGroupOutput: mobilecommons_groups undefined.');
      }

      const doing = response.body.mobilecommons_groups[environment].doing;
      const completed = response.body.mobilecommons_groups[environment].completed;

      return resolve({ doing, completed });
    });
  },

};
