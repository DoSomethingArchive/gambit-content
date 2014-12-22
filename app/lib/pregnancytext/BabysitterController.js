var mobilecommons = rootRequire('mobilecommons')
  , pregnancyTextId = 101
  ;

/**
 * Interface for guiding the babysitter aspect of Pregnancy Text 2014.
 */
var Babysitter = function() {
  this.optinParentOnInviteAlpha;
  this.optinParentOnInviteBeta;
  this.campaignIdParentNoBsAlpha;
  this.campaignIdParentNoBsBeta;
  this.campaignIdParentNoBsResurrected;
  this.optinBsOnInvite;
  this.genericResponses;
}

module.exports = Babysitter;


/**
 * Check if a character is one that can be valid in a phone number.
 *
 * @return True or false.
 */
function canIgnoreForValidPhone(c) {
  return /^[\(\)\[\]\,\.\-]$/.test(c);
}

/**
 * Check if a character is numeric.
 *
 * @return True if numeric, otherwise false.
 */
function isNumeric(c) {
  return /^\d$/.test(c);
}

/**
 * Determine whether or not a string has a valid phone number at the start of
 * its message.
 *
 * @return The valid phone number if one exists, otherwise false.
 */
function hasValidPhone(message) {
  var phone = '';

  // Remove whitespace
  message = message.replace(/ /g, '');

  for (var i = 0; i < message.length; i++) {
    var c = message.charAt(i);

    // If it's a number, then add to our phone string
    if (isNumeric(c)) {

      // If first number is a 1, then skip. All other cases, it's safe to append.
      if (phone.length > 0 || (phone.length === 0 && c !== '1')) {
        phone += c;
      }

      // If we've reached 10 digits, we got ourselves a phone number
      if (phone.length === 10) {
        break;
      }

    }
    // See if it's a character we can skip
    else if (!canIgnoreForValidPhone(c)) {

      // If we're here, then a character was found that makes this number invalid
      break;

    }
  }

  if (phone.length === 10) {
    return phone;
  }
  else {
    return false;
  }
};

/**
 * Randomly selects a generic response to opt the user into.
 */
Babysitter.prototype.sendGenericResponse = function(phone) {
  var args = {alphaPhone: phone};

  // Randomly select a opt-in path
  var index = Math.floor(Math.random() * this.genericResponses.length);
  args['alphaOptin'] = this.genericResponses[index];

  // Trigger the opt-in to send the message to the user
  mobilecommons.optin(args);
};

/**
 * Alpha user is sending a Beta number to invite and become a babysitter.
 */
Babysitter.prototype.onSendBabysitterInvite = function(request, response, optinParent, optoutId) {

  var config = app.getConfig('babysitter_config', pregnancyTextId);

  /**
   * The Mobile Commons opt-in path a parent gets pushed to when he sends a
   * babysitter invitation.
   */
  this.optinParentOnInviteAlpha = config.optinParentOnInviteAlpha;
  this.optinParentOnInviteBeta = config.optinParentOnInviteBeta;

  /**
   * The Mobile Commons campaign id for parents without a babysitter. When a
   * a babysitter invite is sent, parents get opted out of this campaign.
   */
  this.campaignIdParentNoBsAlpha = config.campaignIdParentNoBsAlpha;
  this.campaignIdParentNoBsBeta = config.campaignIdParentNoBsBeta;
  this.campaignIdParentNoBsResurrected = config.campaignIdParentNoBsResurrected;

  /**
   * The Mobile Commons opt-in path a babysitter gets pushed to on the invite.
   */
  this.optinBsOnInvite = config.optinBsOnInvite;

  /**
   * Array of generic response Mobile Commons opt-in paths.
   */
  this.genericResponses = config.genericResponses;

  var alpha = request.body.phone;

  // Validate and retrieve the beta's phone number from the message body.
  var betaPhone = false;
  var args = request.body.args;
  if (!(betaPhone = hasValidPhone(args))) {
    if (request.body.dev !== '1') {
      this.sendGenericResponse(request.body.phone);
    }
    response.send();
    return;
  }

  // With a valid number, send an invite to the beta/babysitter and move the
  // alpha/parent user into the "with babysitter" Mobile Commons campaign.
  var alphaPhone = request.body.phone;

  var optinArgs = {
    alphaPhone: alphaPhone,
    betaPhone: betaPhone,
    alphaOptin: optinParent,
    betaOptin: this.optinBsOnInvite
  };

  if (request.body.dev !== '1') {
    mobilecommons.optin(optinArgs);
  }

  // Opt the alpha/parent user out of the "without babysitter" Mobile Commons campaign.
  var optoutArgs = {
    phone: alphaPhone,
    campaignId: optoutId,

    // Override company key and auth credentials for the Pregnancy Text affiliate account.
    mc_company_key: process.env.MOBILECOMMONS_PREGTEXT_COMPANY_KEY || null,
    mc_auth_email: process.env.MOBILECOMMONS_PREGTEXT_AUTH_EMAIL || null,
    mc_auth_pass: process.env.MOBILECOMMONS_PREGTEXT_AUTH_PASS || null
  };

  if (request.body.dev !== '1') {
    mobilecommons.optout(optoutArgs);
  }

  response.send();
};
