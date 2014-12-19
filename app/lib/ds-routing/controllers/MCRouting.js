/**
 * Custom DS routing.
 */

var mobilecommons = rootRequire('mobilecommons');

var Tips = require('./Tips')
  , tips = new Tips
  , start_campaign_transitions_config = require('../config/start-campaign-transitions')
  , yes_no_paths_config = require('../config/yes-no-paths')
  , campaign_start_config = require('../config/campaign-start')
  ;

var MCRouting = function() {}

/**
 * Opt user into one of two paths depending on whether the response is yes or no.
 */
MCRouting.prototype.yesNoGateway = function(request, response) {
  if (request.body.args === undefined || request.body.opt_in_path_id === undefined) {
    response.sendStatus(204);
    return;
  }

  var args = request.body.args.trim().toLowerCase();
  var incomingOptIn = parseInt(request.body.opt_in_path_id);
  var paths = yes_no_paths_config.yesNoPaths;

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
    response.sendStatus(204);
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
    alphaPhone: request.body.phone,
    alphaOptin: optin
  };
  mobilecommons.optin(args);
  response.send();
};

/**
 * Transition users for the sign up campaign to the actual campaign.
 */
MCRouting.prototype.campaignTransition = function(request, response) {
  if (typeof(request.body.mdata_id) === 'undefined') {
    response.sendStatus(204);
    return;
  }

  var mdataId = parseInt(request.body.mdata_id);
  var transitionConfig = start_campaign_transitions_config.startCampaignTransitions[mdataId];

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
    response.sendStatus(501);
  }
};

/**
 * Handle the responses from the multiple choice start message for each campaign.
 */
MCRouting.prototype.handleStartCampaignResponse = function(request, response) {
  if (typeof(request.body.opt_in_path_id) === 'undefined'
      || typeof(request.body.args) === 'undefined') {
    response.sendStatus(204);
    return;
  }

  var optinPathId = request.body.opt_in_path_id;

  var startConfig = app.getConfig('campaign_start_config', optinPathId)

  // Get the config set that matches this opt_in_path_id.
  // Error out if there's no matching config.
  if (typeof(startConfig) === 'undefined'
      || typeof(startConfig.know) === 'undefined'
      || typeof(startConfig.plan) === 'undefined'
      || typeof(startConfig.do) === 'undefined'
      || typeof(startConfig.prove) === 'undefined') {
    response.sendStatus(501);
    return;
  }

  // Do checks only against the first word in the user response.
  var args = request.body.args;
  args = args.split(' ');
  var firstWord = args[0].toUpperCase();

  // For KNOW, PLAN, and DO, use the tips lib to handle the delivery.
  if (firstWord === '1' || firstWord === 'KNOW' ) {
    tips.deliverTips(request, response, startConfig.know);
  }
  else if (firstWord === '2' || firstWord === 'PLAN' ) {
    tips.deliverTips(request, response, startConfig.plan);
  }
  else if (firstWord === '3' || firstWord === 'DO' ) {
    tips.deliverTips(request, response, startConfig.do);
  }
  // But for the PROVE option, we can just push straight to the opt in path.
  else if (firstWord === '4' || firstWord === 'PROVE' ) {
    var args = {
      alphaPhone: request.body.phone,
      alphaOptin: startConfig.prove
    };

    if (request.body.dev !== '1') {
      mobilecommons.optin(args);
    }
  }

  response.send();
};

module.exports = MCRouting;
