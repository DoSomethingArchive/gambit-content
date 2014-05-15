/**
 * Custom DS routing.
 */
var mobilecommons = require('../../mobilecommons/mobilecommons')
  config = require('./config.json')
  ;

/**
 * Opt user into one of two paths depending on whether the response is yes or no.
 */
exports.yesNoGateway = function(req, res) {
  if (req.query.args === undefined || req.query.opt_in_path_id === undefined) {
    res.send(204);
    return;
  }

  var args = req.query.args.trim().toLowerCase();
  var incomingOptIn = parseInt(req.query.opt_in_path_id);
  var paths = config.yesNoPaths;

  // Find a path configured for the opt-in this request came from.
  var path = undefined;
  for (var i = 0; i < paths.length; i++) {
    var p = paths[i];
    if (p.incomingPath === incomingOptIn) {
      path = p;
      break;
    }
  }

  // If no path can be found, early out.
  if (path === undefined) {
    res.send(204);
    return;
  }

  // Just check based on the first word in the message.
  args = args.split(' ');
  var firstWord = args[0];

  // Default to the 'no' response. Change to 'yes' response if appropriate answer found.
  var optin = path.no;
  var yesAnswers = ['y', 'yes', 'ya', 'yea'];
  for (var i = 0; i < yesAnswers.length; i++) {
    if (yesAnswers[i] === firstWord) {
      optin = path.yes;
      break;
    }
  }

  // Execute the opt-in.
  var args = {
    alphaPhone: req.query.phone,
    alphaOptin: optin
  };
  mobilecommons.optin(args);

  res.send();
};

/**
 * Transition users for the sign up campaign to the actual campaign.
 */
exports.startCampaignGate = function(request, response) {
  if (typeof(request.body.mdata_id) === 'undefined') {
    res.send(204);
    return;
  }

  var mdataId = parseInt(request.body.mdata_id);

  var configs = config.startCampaignTransitions;
  var transitionConfig = undefined;

  // Find the config set for this mdata.
  for (var i = 0; i < configs.length; i++) {
    var c = configs[i];
    if (c.mdataId === mdataId) {
      transitionConfig = c;
      break;
    }
  }

  if (typeof(transitionConfig) !== 'undefined'
      && typeof(transitionConfig.optin) !== 'undefined'
      && typeof(transitionConfig.optout) !== 'undefined') {
    // Opt in the user to the campaign start.
    var optinArgs = {
      alphaPhone: request.body.phone,
      alphaOptin: transitionConfig.optin
    };
    mobilecommons.optin(optinArgs);

    // Opt out the user from the "sign up" campaign.
    var optoutArgs = {
      phone: request.body.phone,
      campaignId: transitionConfig.optout
    };
    mobilecommons.optout(optoutArgs);

    response.send();
  }
  else {
    // Config for that mData is not set.
    response.send(501);
  }
};
