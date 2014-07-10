/**
 * Helper methods to interface with the Mobile Commons API.
 *
 */

var request = require('request')
    ;

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

    request.post( url, payload, function (error, response, body) {
      if (!error && response.statusCode == 200) {
          console.log(body)
      }
    });
  }
  // Otherwise, just execute the opt in for the alpha user
  else {
    request.post(
      url,
      {
        form: {
          opt_in_path: alphaOptin,
          'person[phone]': alphaPhone
        }
      },
      function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body)
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

  // Send opt-out request
  request.post(
    url,
    {
      'auth': {
        'user': authEmail,
        'pass': authPass
      },
      form: {
        'person[phone]': phone,
        campaign: campaignId,
        company_key: companyKey
      }
    }
  );
};

