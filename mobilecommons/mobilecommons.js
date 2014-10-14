/**
 * Helper methods to interface with the Mobile Commons API.
 *
 */

var request = require('request')
    ;

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


  request.post(url, postData, function(error, response, body) {
    if (error) {
      console.error(error);
    }
    else if (response && response.statusCode != 200) {
      console.error('Failed mobilecommons.profile_update with code: ', response.statusCode);
    }
  });
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

    request.post(url, payload, function(error, response, body) {
      if (error) {
        console.error(error);
      }
      else if (response) {
        if (response.statusCode != 200) {
          console.error('Failed mobilecommons.optin with code: ', response.statusCode);
        }
        else {
          console.log(body);
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

    request.post(url, payload, function(error, response, body) {
        if (error) {
          console.error(error);
        }
        else if (response) {
          if (response.statusCode != 200) {
            console.error('Failed mobilecommons.optin with code: ', response.statusCode);
          }
          else {
            console.log(body);
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
  var url = 'https://secure.mcommons.com/profiles/opt_out';

  var phone = args.phone || null;
  var campaignId = args.campaignId || null;

  var companyKey = process.env.MOBILECOMMONS_COMPANY_KEY || null;
  var authEmail = process.env.MOBILECOMMONS_AUTH_EMAIL || null;
  var authPass = process.env.MOBILECOMMONS_AUTH_PASS || null;

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
  request.post(url, payload, function(error, response, body) {
      if (error) {
        console.error(error);
      }
      else if (response) {
        if (response.statusCode != 200) {
          console.error('Failed mobilecommons.optout with code: ', response.statusCode);
        }
        else {
          console.log(body);
        }
      }
    }
  );
};

