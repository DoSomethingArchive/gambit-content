/**
 * Interface for guiding the babysitter aspect of Pregnancy Text 2014.
 *
 */

var mobilecommons = require('../mobilecommons/mobilecommons')
    , mongoose = require('mongoose')
    , config = require('./config.json')
    ;

/**
 * The Mobile Commons opt-in path a parent gets pushed to when he sends a
 * babysitter invitation.
 */
var optinParentOnInviteAlpha = exports.optinParentOnInviteAlpha = config.optinParentOnInviteAlpha;
var optinParentOnInviteBeta = exports.optinParentOnInviteBeta = config.optinParentOnInviteBeta;

/**
 * The Mobile Commons campaign id for parents without a babysitter. When a
 * a babysitter invite is sent, parents get opted out of this campaign.
 */
var campaignIdParentNoBsAlpha = exports.campaignIdParentNoBsAlpha = config.campaignIdParentNoBsAlpha;
var campaignIdParentNoBsBeta = exports.campaignIdParentNoBsBeta = config.campaignIdParentNoBsBeta;
var campaignIdParentNoBsResurrected = exports.campaignIdParentNoBsResurrected = config.campaignIdParentNoBsResurrected;

/**
 * The Mobile Commons opt-in path a babysitter gets pushed to on the invite.
 */
var optinBsOnInvite = exports.optinBsOnInvite = config.optinBsOnInvite;

/**
 * Array of generic response Mobile Commons opt-in paths.
 */
var genericResponses = config.genericResponses;

/**
 * Sets of Mobile Commons opt-in paths for tips.
 */
var waitTips = config.waitTips.optins;
var safeTips = config.safeTips.optins;
var parentTips = config.parentTips.optins;
var rightsTips = config.rightsTips.optins;

/**
 * Name identifiers for the sets of the tips in the database.
 */
var waitTipsName = exports.waitTipsName = config.waitTips.dbKey;
var safeTipsName = exports.safeTipsName = config.safeTips.dbKey;
var parentTipsName = exports.parentTipsName = config.parentTips.dbKey;
var rightsTipsName = exports.rightsTipsName = config.rightsTips.dbKey;

var tipModelName = config.tipModelName;

/**
 * Mongo setup and config.
 */

// Setup Mongo database connection, schemas, and models
var mongoUri = process.env.MONGOLAB_URI
  || process.env.MONGOHQ_URL
  || 'mongodb://localhost/ds-mdata-responder-last-tip-delivered';
mongoose.connect(mongoUri);

// Mongo Schema
var tipSchema = new mongoose.Schema({
  phone: String,
  last_tip_delivered: [{
    name: String,
    last_tip: Number
  }]
});

var tipModel = mongoose.model(tipModelName, tipSchema);


/**
 * Check if a character is one that can be valid in a phone number.
 *
 * @return True or false.
 */
var canIgnoreForValidPhone = function(c) {
  return /^[\(\)\[\]\,\.\-]$/.test(c);
}

/**
 * Check if a character is numeric.
 *
 * @return True if numeric, otherwise false.
 */
var isNumeric = function(c) {
  return /^\d$/.test(c);
}

/**
 * Determine whether or not a string has a valid phone number at the start of
 * its message.
 *
 * @return The valid phone number if one exists, otherwise false.
 */
var hasValidPhone = function(message) {
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
var sendGenericResponse = function(phone) {
  var args = {alphaPhone: phone};

  // Randomly select a opt-in path
  var index = Math.floor(Math.random() * genericResponses.length);
  args['alphaOptin'] = genericResponses[index];

  // Trigger the opt-in to send the message to the user
  mobilecommons.optin(args);
}

/**
 * Alpha user is sending a Beta number to invite and become a babysitter.
 */
exports.onSendBabysitterInvite = function(request, response, optinParent, optoutId) {
  var alpha = request.body.phone;

  // Validate and retrieve the beta's phone number from the message body.
  var betaPhone = false;
  var args = request.body.args;
  if (!(betaPhone = hasValidPhone(args))) {
    if (request.body.dev !== '1') {
      sendGenericResponse(request.body.phone);
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
    betaOptin: optinBsOnInvite
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

/**
 * Progress a user through a series of tips delivered via Mobile Commons opt-in paths.
 */
exports.deliverTips = function(request, response, tipName) {

  // Determine which array of tips to use based on the tipName provided
  var tips = {};
  switch (tipName) {
    case waitTipsName:
      tips = waitTips;
      break;
    case safeTipsName:
      tips = safeTips;
      break;
    case parentTipsName:
      tips = parentTips;
      break;
    case rightsTipsName:
      tips = rightsTips;
      break;
    default:
      console.log('Invalid tipName provided: ' + tipName);
      return;
  }

  // Find an existing document for a user with the requesting phone number
  tipModel.findOne(
    {phone: request.body.phone},
    function(err, doc) {
      if (err) return console.log(err);

      // An existing doc for this phone number has been found
      if (doc) {

        var lastTip = -1;
        var ltdIndex = -1;

        // Check to see what tip the user received last
        for (var i = 0; i < doc.last_tip_delivered.length; i++) {
          if (doc.last_tip_delivered[i].name === tipName) {
            lastTip = doc.last_tip_delivered[i].last_tip;
            ltdIndex = i;
          }
        }

        // Get index of the last tip delivered
        var tipIndex = -1;
        if (lastTip > 0) {
          tipIndex = tips.indexOf(lastTip);
        }

        // Select next tip
        tipIndex++;

        // If next selected tip is past the end, loop back to the first one
        if (tipIndex >= tips.length) {
          tipIndex = 0;
        }

        // Get the opt-in path for the next tip
        var optin = tips[tipIndex];

        // Update last_tip with the selected opt-in path
        if (ltdIndex >= 0) {
          doc.last_tip_delivered[ltdIndex].last_tip = optin;
        }
        else {
          doc.last_tip_delivered[doc.last_tip_delivered.length] = {
            'name': tipName,
            'last_tip': optin
          };
        }

        // Send the opt-in request to Mobile Commons
        var args = {
          alphaPhone: request.body.phone,
          alphaOptin: optin
        };

        if (request.body.dev !== '1') {
          mobilecommons.optin(args);
        }

        // Update the existing doc in the database
        var data = {
          'phone': request.body.phone,
          'last_tip_delivered': doc.last_tip_delivered
        };

        tipModel.update(
          {phone: request.body.phone},
          data,
          function(err, num, raw) {
            if (err) return console.log(err);

            console.log('Updated %d document(s). Mongo raw response:', num);
            console.log(raw);
            console.log("\n\n");
          }
        );
      }
      // An existing doc for this phone was not found
      else {
        // Select the first opt in path in the array
        var optin = tips[0];
        var args = {
          alphaPhone: request.body.phone,
          alphaOptin: optin
        };

        if (request.body.dev !== '1') {
          mobilecommons.optin(args);
        }

        // Create a new doc
        var model = new tipModel({
          'phone': request.body.phone,
          'last_tip_delivered': [{
            'name': tipName,
            'last_tip': optin
          }]
        });

        // Save the doc to the database
        model.save(function(err) {
          if (err) return console.log(err);

          return console.log("Save successful.\n\n");
        });

        console.log('Saving new model: ' + model);
      }
    }
  );

  response.send();
};
