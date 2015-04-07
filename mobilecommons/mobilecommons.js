/**
 * Helper methods to interface with the Mobile Commons API.
 *
 */

var RequestRetry = require('node-request-retry')
  , logger = rootRequire('app/lib/logger')
  , emitter = rootRequire('app/eventEmitter')
  ;


// Modifying the default Request library's request object.
RequestRetry.setDefaults({timeout: 120000});

/**
* Mobile Commons profile_update API. Can be used to subscribe the user to an
* opt-in path.
*
* @param phone
*   Phone number of the profile to update.
* @param optInPathId
*   Opt-in path to subscribe the user to.
* @param customFields
*   Array of custom profile field names and values to update the user with.
*/

exports.profile_update = function(phone, optInPathId, customFields) {
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

  // If we're in a test env, just log and emit an event.
  if (process.env.NODE_ENV == 'test') {
    logger.info('mobilecommons.profile_update: ', phone, ' | ', optInPathId, ' | ', customFields);
    emitter.emit(emitter.events.mcProfileUpdateTest, postData);
    return;
  }

  var trace = new Error().stack;
  var callback = function(error, response, body) {
    if (error) {
      logger.error('Failed mobilecommons.profile_update for user phone: '
        + phone + ' | form data: ' + JSON.stringify(postData.form) 
        + ' | error: ' + error + ' | stack: ' + trace);
    }
    else if (response && response.statusCode != 200) {
      logger.error('Failed mobilecommons.profile_update for user phone: '
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
 * Opt-in mobile numbers into specified Mobile Commons paths.
 */
exports.optin = function(args) {
  var url = 'https://secure.mcommons.com/profiles/join';

  var alphaPhone = args.alphaPhone || null;
  var betaPhone = args.betaPhone || null;
  var alphaOptin = args.alphaOptin || 0;
  var betaOptin = args.betaOptin || 0;
  var callback;
  var requestRetry = new RequestRetry();
  requestRetry.setRetryConditions([400, 408, 500]);

  // Need at least these in order to continue
  if (alphaPhone == null || alphaOptin <= 0)
    return;

  // If we have beta details, then create form with that beta info
  if (betaPhone != null && betaOptin > 0) {
    var payload = {
      form: {
        opt_in_path: alphaOptin,
        friends_opt_in_path: betaOptin,
        'person[phone]': alphaPhone
      }
    };

    if (Array.isArray(betaPhone)) {
      betaPhone.forEach(function(value, index, set) {
        payload.form['friends['+index+']'] = value;
      });
    }
    else {
      payload.form['friends[]'] = betaPhone;
    }

    // If we're in a test env, just log and emit an event.
    if (process.env.NODE_ENV == 'test') {
      logger.info('mobilecommons.optin: ', args);
      emitter.emit(emitter.events.mcOptinTest, payload);
      return;
    }

    var trace = new Error().stack;
    callback = function(error, response, body) {
      if (error) {
        logger.error('Failed mobilecommons.optin for user: ' + alphaPhone
          + ' | with request payload: ' + JSON.stringify(payload)
          + ' | with error: ' + JSON.stringify(error)
          + ' | stack: ' + trace);
      }
      else if (response) {
        if (response.statusCode != 200) {
          logger.error('Failed mobilecommons.optin for user: ' + alphaPhone
            + ' | with request payload: ' + JSON.stringify(payload)
            + ' | with code: ' + response.statusCode 
            + ' | body: ' + body + ' | stack: ' + trace);
        }
        else {
          logger.info('Success mobilecommons.optin: ', alphaOptin);
        }
      }
    };

    requestRetry.post(url, payload, callback);
  }
  // Otherwise, just execute the opt in for the alpha user
  else {
    var payload = {
      form: {
        opt_in_path: alphaOptin,
        'person[phone]': alphaPhone
      }
    };

    // If we're in a test env, just log and emit an event.
    if (process.env.NODE_ENV == 'test') {
      logger.info('mobilecommons.optin: ', args);
      emitter.emit(emitter.events.mcOptinTest, payload);
      return;
    }

    var trace = new Error().stack;
    callback = function(error, response, body) {
      if (error) {
        logger.error('Failed mobilecommons.optin for user: ' + alphaPhone
          + ' | with request payload: ' + JSON.stringify(payload)
          + ' | with error: ' + JSON.stringify(error)
          + ' | stack: ' + trace);
      }
      else if (response) {
        if (response.statusCode != 200) {
          logger.error('Failed mobilecommons.optin for user: ' + alphaPhone
            + ' | with request payload: ' + JSON.stringify(payload)
            + ' | with code: ' + response.statusCode + ' | body: '
            + body + ' | stack: ' + trace);
        }
        else {
          logger.info('Success mobilecommons.optin into: ', alphaOptin);
        }
      }
    };

    requestRetry.post(url, payload, callback);
  }
};

/**
 * Opt out of a Mobile Commons campaign.
 */
exports.optout = function(args) {
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

  // If we're in a test env, just log and emit an event.
  if (process.env.NODE_ENV == 'test') {
    logger.info('mobilecommons.optout: ', args);
    emitter.emit(emitter.events.mcOptoutTest, payload);
    return;
  }

  var trace = new Error().stack;
  var callback = function(error, response, body) {
    if (error) {
      logger.error('Failed mobilecommons.optout for user: ' + phone
        + ' | with request payload: ' + JSON.stringify(payload.form)
        + ' | with error: ' + JSON.stringify(error)
        + ' | stack: ' + trace);
    }
    else if (response) {
      if (response.statusCode != 200) {
        logger.error('Failed mobilecommons.optout for user: ' + phone
          + ' | with request payload: ' + JSON.stringify(payload.form)
          + ' | with code: ' + response.statusCode
          + ' | body: ' + body + ' | stack: ' + trace);
      }
      else {
        logger.info('Success mobilecommons.optout from: ', campaignId);
      }
    }
  };

  var requestRetry = new RequestRetry();
  requestRetry.setRetryConditions([400, 408, 500]);
  requestRetry.post(url, payload, callback);
};