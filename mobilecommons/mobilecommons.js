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

  // var request = args.request || null;
  var alphaPhone = args.alphaPhone || null;
  var betaPhone = args.betaPhone || null;
  var alphaOptin = args.alphaOptin || 0;
  var betaOptin = args.betaOptin || 0;

  // Need at least these in order to continue
  if (request == null || alphaPhone == null || alphaOptin <= 0)
    return;

  // If we have beta details, then create form with that beta info
  if (betaPhone != null && betaOptin > 0) {
    request.post(
      url,
      {
        form: {
          opt_in_path: alphaOptin,
          friends_opt_in_path: betaOptin,
          'person[phone]': alphaPhone,
          'friends[]': betaPhone
        }
      },
      function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body)
        }
      }
    );
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

  // @todo argument validation
  // @todo get company key

  request.post(
    url,
    {
      form: {
        'person[phone]': phone,
        campaign: campaignId,
        company_key: '0' // @todo
      }
    }
  );
};

