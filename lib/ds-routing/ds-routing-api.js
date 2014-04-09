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

  var args = req.query.args.trim();
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

  // Determine if there's a 'yes' response.
  var isYes = false;
  var yesAnswers = ['y', 'yes', 'ya', 'yea'];
  for (var i = 0; i < yesAnswers.length; i++) {
    if (yesAnswers[i] === firstWord) {
      isYes = true;
      break;
    }
  }

  // Choose the opt-in path based on the answer.
  var optin;
  if (isYes) {
    optin = path.yes;
  }
  else {
    optin = path.no;
  }

  // Execute the opt-in.
  var args = {
    alphaPhone: req.query.phone,
    alphaOptin: optin
  };
  mobilecommons.optin(args);

  res.send();
};
