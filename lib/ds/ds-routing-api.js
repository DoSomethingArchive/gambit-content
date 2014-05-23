/**
 * Custom DS routing.
 */
var mobilecommons = require('../../mobilecommons/mobilecommons')
    , routing_config = require('./routing-config.json')
    , tips_api = require('./tips-api')
    , campaign_start_config = require('./campaign-start-config.json')
    ;

/**
 * Opt user into one of two paths depending on whether the response is yes or no.
 */
exports.yesNoGateway = function(request, response) {
  if (request.query.args === undefined || request.query.opt_in_path_id === undefined) {
    response.send(204);
    return;
  }

  var args = request.query.args.trim().toLowerCase();
  var incomingOptIn = parseInt(request.query.opt_in_path_id);
  var paths = routing_config.yesNoPaths;

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
    response.send(204);
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
    alphaPhone: request.query.phone,
    alphaOptin: optin
  };
  mobilecommons.optin(args);

  response.send();
};

/**
 * Transition users for the sign up campaign to the actual campaign.
 */
exports.startCampaignGate = function(request, response) {
  if (typeof(request.body.mdata_id) === 'undefined') {
    response.send(204);
    return;
  }

  var mdataId = parseInt(request.body.mdata_id);
  var transitionConfig = routing_config.startCampaignTransitions[mdataId];

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

/**
 * Handle the responses from the multiple choice start message for each campaign.
 */
exports.handleStartCampaignResponse = function(request, response) {
  if (typeof(request.body.opt_in_path_id) === 'undefined'
      || typeof(request.body.args) === 'undefined') {
    response.send(204);
    return;
  }

  // Ensure it's a string.
  var optinPathId = request.body.opt_in_path_id;
  optinPathId = optinPathId.toString();

  // Get the config set that matches this opt_in_path_id.
  // Error out if there's no matching config.
  if (typeof(campaign_start_config[optinPathId]) === 'undefined'
      || typeof(campaign_start_config[optinPathId].KNOW) === 'undefined'
      || typeof(campaign_start_config[optinPathId].PLAN) === 'undefined'
      || typeof(campaign_start_config[optinPathId].DO) === 'undefined'
      || typeof(campaign_start_config[optinPathId].PROVE) === 'undefined') {
    response.send(501);
    return;
  }

  var csConfig = campaign_start_config[optinPathId];

  // Do checks only against the first word in the user response.
  var args = request.body.args;
  args = args.split(' ');
  var firstWord = args[0].toUpperCase();

  // For KNOW, PLAN, and DO, use the tips lib to handle the delivery.
  if (firstWord === '1' || firstWord === 'KNOW' ) {
    tips_api.deliverTips(request, response, csConfig.KNOW);
  }
  else if (firstWord === '2' || firstWord === 'PLAN' ) {
    tips_api.deliverTips(request, response, csConfig.PLAN);
  }
  else if (firstWord === '3' || firstWord === 'DO' ) {
    tips_api.deliverTips(request, response, csConfig.DO);
  }
  // But for the PROVE option, we can just push straight to the opt in path.
  else if (firstWord === '4' || firstWord === 'PROVE' ) {
    var args = {
      alphaPhone: request.body.phone,
      alphaOptin: csConfig.PROVE
    };

    if (request.body.dev !== '1') {
      mobilecommons.optin(args);
    }
  }

  response.send();
};
