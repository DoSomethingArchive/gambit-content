/**
 * Helper methods to interface with the Mobile Commons API.
 *
 */

var request = require('request')
  , logger = require('../app/lib/logger')
  ;

// Modifying the default Request library's request object.
var modifiedRequest = request.defaults({
  timeout: 120000
});

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
  if (process.env.NODE_ENV == 'test') {
    logger.info('mobilecommons.profile_update: ', phone, ' | ', optInPathId, ' | ', customFields);
    return;
  }

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


  modifiedRequest.post(url, postData, function(error, response, body) {
    if (error) {
      logger.error(error);
    }
    else if (response && response.statusCode != 200) {
      logger.error('Failed mobilecommons.profile_update with code: ' + response.statusCode,
        '| body: ' + body, '| stack: ' + new Error().stack);
    }
  });
};

/**
 * Opt-in mobile numbers into specified Mobile Commons paths.
 */
exports.optin = function(args) {
  if (process.env.NODE_ENV == 'test') {
    logger.info('mobilecommons.optin: ', args);
    return;
  }

  var url = 'https://secure.mcommons.com/profiles/join';

  var alphaPhone = args.alphaPhone || null;
  var betaPhone = args.betaPhone || null;
  var alphaOptin = args.alphaOptin || 0;
  var betaOptin = args.betaOptin || 0;

  // Need at least these in order to continue
  if (request == null || alphaPhone == null || alphaOptin <= 0)
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

    modifiedRequest.post(url, payload, function(error, response, body) {
      if (error) {
        logger.error(error);
      }
      else if (response) {
        if (response.statusCode != 200) {
          logger.error('Failed mobilecommons.optin with code: ' + response.statusCode,
            '| body: ' + body, '| stack: ' + new Error().stack);
        }
        else {
          logger.info('Success mobilecommons.optin: ', alphaOptin);
        }
      }
    });
  }
  // Otherwise, just execute the opt in for the alpha user
  else {
    var payload = {
      form: {
        opt_in_path: alphaOptin,
        'person[phone]': alphaPhone
      }
    };

    modifiedRequest.post(url, payload, function(error, response, body) {
        if (error) {
          logger.error(error);
        }
        else if (response) {
          if (response.statusCode != 200) {
            logger.error('Failed mobilecommons.optin with code: ' + response.statusCode,
              '| body: ' + body, '| stack: ' + new Error().stack);
          }
          else {
            logger.info('Success mobilecommons.optin into: ', alphaOptin);
          }
        }
      }
    );
  }
};

/**
 * Opt out of a Mobile Commons campaign.
 */
exports.optout = function(args) {
  if (process.env.NODE_ENV == 'test') {
    logger.info('mobilecommons.optout: ', args);
    return;
  }

  var url = 'https://secure.mcommons.com/profiles/opt_out';

  var phone = args.phone || null;
  var campaignId = args.campaignId || null;

  // A note on where MOBILECOMMONS_* variables are set:
  // On CentOS servers, variables to be set for the system wide profile that are
  // maintained even through a system reboot are recommended to be placed in
  // the /etc/profile.d/ folder. So look there if any of these MOBILECOMMONS_*
  // environment variables need to be changed.
  var companyKey = args.mc_company_key || process.env.MOBILECOMMONS_COMPANY_KEY || null;
  var authEmail = args.mc_auth_email || process.env.MOBILECOMMONS_AUTH_EMAIL || null;
  var authPass = args.mc_auth_pass || process.env.MOBILECOMMONS_AUTH_PASS || null;

  // Exit out if one of the values isn't available
  if (!phone || !campaignId || !companyKey || !authEmail || !authPass) {
    return;
  }

  var payload = {
    'auth': {
      'user': authEmail,
      'pass': authPass
    },
    form: {
      'person[phone]': phone,
      campaign: campaignId,
      company_key: companyKey
    }
  };

  // Send opt-out request
  modifiedRequest.post(url, payload, function(error, response, body) {
      if (error) {
        logger.error(error);
      }
      else if (response) {
        if (response.statusCode != 200) {
          logger.error('Failed mobilecommons.optout with code: ' + response.statusCode,
            '| body: ' + body, '| stack: ' + new Error().stack);
        }
        else {
          logger.info('Success mobilecommons.optout from: ', campaignId);
        }
      }
    }
  );
};

