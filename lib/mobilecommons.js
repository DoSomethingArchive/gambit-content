/**
 * Helper methods to interface with the Mobile Commons API.
 */

const request = require('request-promise-native');
const RequestRetry = require('node-request-retry');
const helpers = rootRequire('lib/helpers');
const _ = require('underscore');
const logger = app.locals.logger;

// Modifying the default Request library's request object.
RequestRetry.setDefaults({timeout: 120000});

const uri = 'https://secure.mcommons.com/api';
const auth = {
  user: process.env.MOBILECOMMONS_AUTH_EMAIL,
  pass: process.env.MOBILECOMMONS_AUTH_PASS,
};

/**
* Mobile Commons profile_update API. Can be used to subscribe the user to an
* opt-in path.
*
* @see https://mobilecommons.zendesk.com/hc/en-us/articles/202052534-REST-API#ProfileUpdate
*
* @param phone
*   Phone number of the profile to update.
* @param optInPathId
*   Opt-in path to subscribe the user to.
* @param customFields
*   Object with MoCo custom profile field names as properties, and values to update the user with.
*   Note: Field names are case-sensitive.
*/

exports.profile_update = function(phone, optInPathId, customFields) {
  if (process.env.MOBILECOMMONS_DISABLED) {
    logger.warn('MOBILECOMMONS_DISABLED');

    return;
  }

  logger.log('debug', 'mobilecommons.profile_update for mobile:%s oip:%s customFields:%s', phone, optInPathId, JSON.stringify(customFields));

  var url = 'https://secure.mcommons.com/api/profile_update';
  var authEmail = process.env.MOBILECOMMONS_AUTH_EMAIL;
  var authPass = process.env.MOBILECOMMONS_AUTH_PASS;

  var postData = {
    auth: {
      user: authEmail,
      pass: authPass
    },
    form:{
      phone_number: phone,
      opt_in_path_id: optInPathId
    }
  };

  if (typeof customFields == 'object') {
    var customFieldKeys = Object.keys(customFields);
    for (var i = 0; i < customFieldKeys.length; i++) {
      var key = customFieldKeys[i];
      postData.form[key] = customFields[key];
    }
  }

  var trace = new Error().stack;
  var callback = function(error, response, body) {
    if (error) {
      logger.error('mobilecommons.profile_update mobile:%s form:%s error:%s', phone, JSON.stringify(postData.form), error);
    }
    else if (response && response.statusCode != 200) {
      logger.error('mobilecommons.profile_update for mobile:'
        + phone + ' | form data: ' + JSON.stringify(postData.form)
        + '| with code: ' + response.statusCode
        + ' | body: ' + body + ' | stack: ' + trace);
    }
  };

  var requestRetry = new RequestRetry();
  requestRetry.setRetryConditions([400, 408, 500]);
  requestRetry.post(url, postData, callback);
};

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

/**
 * Create new Mobile Commons Group with given groupName.
 */
exports.createGroup = function (groupName) {
  logger.debug(`mobilecommons.createGroup ${groupName}`);

  const data = {
    auth,
    form: { name: groupName },
  };
  const url = `${uri}/create_group`;

  return request.post(url, data, (err, res, body) => {
    if (err) {
      logger.error(err);
      return;
    }

    return body;
  });
};
