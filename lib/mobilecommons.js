'use strict';

const RequestRetry = require('node-request-retry');
const logger = require('winston');
const stathat = require('./stathat');

RequestRetry.setDefaults({ timeout: 120000 });

const uri = 'https://secure.mcommons.com/api';
const auth = {
  user: process.env.MOBILECOMMONS_AUTH_EMAIL,
  pass: process.env.MOBILECOMMONS_AUTH_PASS,
};

const masterCampaignId = process.env.MOBILECOMMONS_MASTER_CAMPAIGN_ID;
if (!masterCampaignId) logger.warn('Missing Mobile Commons Master Campaign ID');
const mobileCommonsDisabled = process.env.MOBILECOMMONS_DISABLED;

/**
* Mobile Commons profile_update API. Can be used to subscribe the user to an opt-in path.
* @see https://mobilecommons.zendesk.com/hc/en-us/articles/202052534-REST-API#ProfileUpdate
*
* @param {object} profileId - Mobile Commons Profile ID
* @param {number} phone - Phone to opt in
* @param {string} oip - Opt-in Path to post to
* @param {object} updateFields - field values to update on current User's Mobile Commons Profile
*/
exports.profile_update = function (profileId, phone, oip, updateFields) {
  const statName = 'mobilecommons: POST profile_update';
  if (mobileCommonsDisabled) {
    logger.warn('MOBILECOMMONS_DISABLED');

    return;
  }

  // Avoid logging mobile numbers when possible.
  let identifier;
  if (!profileId) {
    identifier = `phone:${phone}`;
  } else {
    identifier = `profile:${profileId}`;
  }
  const updateTxt = JSON.stringify(updateFields);
  logger.info(`mobilecommons.profile_update ${identifier} oip:${oip} update:${updateTxt}`);

  const data = { auth, form: {} };
  const fieldNames = Object.keys(updateFields);
  fieldNames.forEach((fieldName) => {
    data.form[fieldName] = updateFields[fieldName];
  });
  data.form.phone_number = phone;
  data.form.opt_in_path_id = oip;

  const requestRetry = new RequestRetry();
  requestRetry.setRetryConditions([400, 408, 500]);
  requestRetry.post(`${uri}/profile_update`, data, (error, response) => {
    const logMsg = `${statName} ${response.statusCode}`;
    stathat.postStat(logMsg);

    if (error) {
      logger.error(error.message);
      logger.error(error.stack);
    }
  });
};

/**
 * Send a message to the given phone number with the given message.
 *
 * @param  {string} phoneNumber Phone number to send msg to.
 * @param  {string} message     Message to send.
 */
exports.send_message = function (phoneNumber, message) {
  if (mobileCommonsDisabled) {
    logger.warn('MOBILECOMMONS_DISABLED');

    return;
  }

  if (!masterCampaignId) {
    logger.warn('Missing Mobile Commons Master Campaign ID');
    return;
  }

  const data = {
    auth,
    form: {
      phone_number: phoneNumber,
      body: message,
      campaign_id: masterCampaignId,
    },
  };

  // Avoid logging phone numbers, so simply log the sent message:
  logger.info(`mobilecommons.send_message:${message}`);

  const requestRetry = new RequestRetry();
  requestRetry.setRetryConditions([400, 408, 500]);
  requestRetry.post(`${uri}/send_message`, data, (error, response) => {
    const logMsg = `mobilecommons: POST send_message ${response.statusCode}`;
    stathat.postStat(logMsg);

    if (error) {
      logger.error('Error posting SMS to Mobile Commons', error.message);
    }
  });
};
