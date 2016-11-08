/**
 * Helper methods to interface with the Mobile Commons API.
 */

const request = require('request-promise-native');
const RequestRetry = require('node-request-retry');
const helpers = rootRequire('lib/helpers');
const _ = require('underscore');
const logger = app.locals.logger;
const stathat = app.locals.stathat;

// Modifying the default Request library's request object.
RequestRetry.setDefaults({timeout: 120000});

const uri = 'https://secure.mcommons.com/api';
const auth = {
  user: process.env.MOBILECOMMONS_AUTH_EMAIL,
  pass: process.env.MOBILECOMMONS_AUTH_PASS,
};

/**
* Mobile Commons profile_update API. Can be used to subscribe the user to an opt-in path.
* @see https://mobilecommons.zendesk.com/hc/en-us/articles/202052534-REST-API#ProfileUpdate
*
* @param {object} profileId - Mobile Commons Profile ID
* @param {number} phone - Phone to opt in
* @param {string} oip - Opt-in Path to post to
* @param {object} updateFields - field values to update on current User's Mobile Commons Profile
*/
exports.profile_update = function(profileId, phone, oip, updateFields) {
  const statName = 'mobilecommons: POST profile_update';
  if (process.env.MOBILECOMMONS_DISABLED) {
    logger.warn('MOBILECOMMONS_DISABLED');

    return;
  }

  const updateTxt = JSON.stringify(updateFields);
  logger.info(`mobilecommons.profile_update profile:${profileId} oip:${oip} update:${updateTxt}`);

  const data = {
    auth,
    form: {
      phone_number: phone,
      opt_in_path_id: oip
    }
  };

  if (typeof updateFields == 'object') {
    const fieldNames = Object.keys(updateFields);
    fieldNames.forEach((fieldName) => {
      data.form[fieldName] = updateFields[fieldName];
    });
  }
  
  const requestRetry = new RequestRetry();
  requestRetry.setRetryConditions([400, 408, 500]);
  requestRetry.post(`${uri}/profile_update`, data, (error, response, body) => {
    const logMsg = `${statName} ${response.statusCode}`;
    stathat(logMsg);

    if (error) {
      logger.error(error.message);
      logger.error(error.stack);
    }
  });
};

/**
 * Legacy functions.
 */

/**
 * Opt-in mobile numbers into specified Mobile Commons paths. Can take custom
 * key-value pairs in the args input in order to update custom profile fields
 * of the alphPhone user.
 */
exports.optin = function(args) {
  logger.log('debug', 'mobilecommons.optin:%s', JSON.stringify(args));
  var url = 'https://secure.mcommons.com/profiles/join'
    , standardKeys = ['alphaPhone', 'betaPhone', 'alphaOptin', 'betaOptin']
    , alphaPhone = args.alphaPhone || null
    , betaPhone = args.betaPhone || null
    , alphaOptin = args.alphaOptin || 0
    , betaOptin = args.betaOptin || 0
    , callback
    , payload
    , keys
    , i
    , customFieldString
    , requestRetry = new RequestRetry()
    ;

  requestRetry.setRetryConditions([400, 408, 500]);

  // Need at least these in order to continue
  if (alphaPhone == null || alphaOptin <= 0) {
    return;
  }

  payload = {
    form: {
      opt_in_path: alphaOptin,
      'person[phone]': alphaPhone
    }
  };

  // If we have beta details, then create form with that beta info
  if (betaPhone != null && betaOptin > 0) {
    payload.form.friends_opt_in_path = betaOptin;
    if (Array.isArray(betaPhone)) {
      betaPhone.forEach(function(value, index, set) {
        payload.form['friends['+index+']'] = value;
      });
    }
    else {
      payload.form['friends[]'] = betaPhone;
    }
  }

  // If a custom field exists in args, add it to the payload.
  keys = Object.keys(args);
  for (i = 0; i < keys.length; i++) {
    if (! _.contains(standardKeys, keys[i])) {
      customFieldString = 'person[' + keys[i] + ']';
      payload.form[customFieldString] = args[keys[i]];
    }
  }

  var trace = new Error().stack;
  callback = function(error, response, body) {
    if (error) {
      logger.error('mobilecommons.optin error user:' + alphaPhone
        + ' | with request payload: ' + JSON.stringify(payload)
        + ' | with error: ' + JSON.stringify(error)
        + ' | stack: ' + trace);
    }
    else if (response) {
      if (response.statusCode != 200) {
        logger.error('mobilecommons.optin failed user:' + alphaPhone
          + ' | with request payload: ' + JSON.stringify(payload)
          + ' | with code: ' + response.statusCode + ' | body: '
          + body + ' | stack: ' + trace);
      }
      else {
        logger.info('mobilecommons.optin success oip:%d user:%s', alphaOptin, alphaPhone);
      }
    }
  };

  requestRetry.post(url, payload, callback);

};

/**
 * Opt out of a Mobile Commons campaign.
 */
exports.optout = function(args) {
  logger.log('debug', 'mobilecommons.optout:%s', JSON.stringify(args));
  var url = 'https://secure.mcommons.com/api/profile_opt_out'
    , phone = args.phone || null
    , campaignId = args.campaignId || null
    , authEmail = process.env.MOBILECOMMONS_AUTH_EMAIL || null
    , authPass = process.env.MOBILECOMMONS_AUTH_PASS || null
    ;

  // Exit out if one of the values isn't available
  if (!phone || !campaignId || !authEmail || !authPass) {
    return;
  }

  var payload = {
    'auth': {
      'user': authEmail,
      'pass': authPass
    },
    form: {
      phone_number: phone,
      campaign_id: campaignId
    }
  };

  var trace = new Error().stack;
  var callback = function(error, response, body) {
    if (error) {
      logger.error('mobilecommons.optout error user: ' + phone
        + ' | with request payload: ' + JSON.stringify(payload.form)
        + ' | with error: ' + JSON.stringify(error)
        + ' | stack: ' + trace);
    }
    else if (response) {
      if (response.statusCode != 200) {
        logger.error('mobilecommons.optout failed user: ' + phone
          + ' | with request payload: ' + JSON.stringify(payload.form)
          + ' | with code: ' + response.statusCode
          + ' | body: ' + body + ' | stack: ' + trace);
      }
      else {
        logger.info('mobilecommons.optout success moco_campaign:' + campaignId + ' user:' + phone);
      }
    }
  };

  var requestRetry = new RequestRetry();
  requestRetry.setRetryConditions([400, 408, 500]);
  requestRetry.post(url, payload, callback);
};

/**
 * TODO: Remove this function once donorschoosebot endpoint is live.
 *
 * Posts to a chatbot optInPath to send msgTxt to given member.
 * @param {object} member
 * @param {number} optInPath - Id of Opt-in path, needs to contain
 *     {{gambit_chatbot_response}} in Liquid to render our msgTxt
 * @param {string} msgTxt - Message to send to our member
 * @param {object} [profileFields] - Additional Key/value object to save as
 *     Mobile Commons Custom Fields on our member's profile.
 */
exports.chatbot = function(member, optInPath, msgTxt, profileFields) {
  if (typeof optInPath === 'undefined') {
    logger.error('mobilecommons.chatbot undefined optInPath user:%s msgText:%s',
      member, msgTxt);
    return;
  }
  var mobileNumber = helpers.getNormalizedPhone(member.phone);
  // Check for any Liquid tokens to substitute.
  // Currently only supporting postal_code.
  if (member.profile_postal_code) {
    msgTxt = msgTxt.replace('{{postal_code}}', member.profile_postal_code);
  }

  if (typeof profileFields === 'undefined') {
    profileFields = {gambit_chatbot_response: msgTxt};
  }
  else {
    profileFields.gambit_chatbot_response = msgTxt;
  }

  this.profile_update(mobileNumber, optInPath, profileFields);
}
