/**
 * Interface for guiding the babysitter aspect of Pregnancy Text 2014.
 *
 */

var mobilecommons = require('../mobilecommons/mobilecommons')
    ;

var exports = module.exports;

/**
 * The Mobile Commons opt-in path a parent gets pushed to when he sends a
 * babysitter invitation.
 */
var optinParentOnInvite = exports.optinParentOnInvite = 165619;

/**
 * The Mobile Commons campaign id for parents without a babysitter. When a
 * a babysitter invite is sent, parents get opted out of this campaign.
 */
var campaignIdParentNoBs = exports.campaignIdParentNoBs = 124863;

/**
 * The Mobile Commons opt-in path a babysitter gets pushed to on the invite.
 */
var optinBsOnInvite = exports.optinBsOnInvite = 165621;


/**
 * Alpha user is sending a Beta number to invite and become a babysitter.
 */
exports.onSendBabysitterInvite = function(request, response) {
  var alpha = request.body.phone;

  var args = request.body.args;
  var words = args.split(' ');
  var betaPhone = words[0];

  // Validate the phone number
  var betaNotValid = false;
  var isValidString = (typeof betaPhone === 'string') && betaPhone != '';
  if (isValidString) {
    // Remove any non-numeric characters
    betaPhone = betaPhone.replace(/[^0-9]/g, '');

    // Not valid if not a 10 digit number or for 11 digits if the first number isn't '1'
    if (!(betaPhone.length == 11 && betaPhone.charAt(0) == '1') && betaPhone.length != 10) {
      betaNotValid = true;
    }
  }
  else {
    betaNotValid = true;
  }

  // Error response if beta number is not valid
  if (betaNotValid) {
    response.send("That wasn't a valid phone number.");
    return;
  }

  // With a valid number, send an invite to the beta/babysitter and move the
  // alpha/parent user into the "with babysitter" Mobile Commons campaign.
  var alphaPhone = request.body.phone;

  var args = {
    alphaPhone: alphaPhone,
    betaPhone: betaPhone,
    alphaOptin: optinParentOnInvite,
    betaOptin: optinBsOnInvite
  };

  mobilecommons.optin(args);

  response.send('OK');
};
