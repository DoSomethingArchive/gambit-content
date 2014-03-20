/**
 * Interface for guiding the babysitter aspect of Pregnancy Text 2014.
 *
 */

var mobilecommons = require('../mobilecommons/mobilecommons')
    , mongoose = require('mongoose')
    ;

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
 * Sets of Mobile Commons opt-in paths for tips.
 */
var waitTips = [165699, 165701, 165703, 165707, 165709, 165711, 165713, 165715, 165717, 165719];
var safeTips = [165683, 165685, 165687, 165689, 165691, 165693, 165695, 165697];
var parentTips = [165677, 165679, 165681];
var rightsTips = [165671, 165673, 165675];

/**
 * Name identifiers for the sets of the tips in the database.
 */
var waitTipsName = exports.waitTipsName = 'pregtext2014-wait';
var safeTipsName = exports.safeTipsName = 'pregtext2014-safe';
var parentTipsName = exports.parentTipsName = 'pregtext2014-parent';
var rightsTipsName = exports.rightsTipsName = 'pregtext2014-rights';

var modelName = 'Tip';

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

var tipModel = mongoose.model('Tip', tipSchema);

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
          if (doc.last_tip_delivered[i].name == tipName) {
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

        mobilecommons.optin(args);

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

            console.log('Updated %d document(s).', num);
            console.log('The raw response from Mongo was ' + raw + "\n\n\n");
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
        mobilecommons.optin(args);

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
