"use strict";

/**
 * Submits a donation to DonorsChoose.org on behalf of a MoCo member.
 * Currently only used for Science Sleuth.
 */
var donorsChooseApiKey = (process.env.DONORSCHOOSE_API_KEY || 'DONORSCHOOSE')
  , donorsChooseApiPassword = (process.env.DONORSCHOOSE_API_PASSWORD || 'helpClassrooms!')
  , donorsChooseDonationBaseURL = 'https://apisecure.donorschoose.org/common/json_api.html?'
  , donorsChooseProposalsQueryBaseURL = 'https://api.donorschoose.org/common/json_feed.html'
  , defaultDonorsChooseTransactionEmail = (process.env.DONORSCHOOSE_DEFAULT_EMAIL || null);

if (process.env.NODE_ENV != 'production') {
  donorsChooseProposalsQueryBaseURL = 'https://qa.donorschoose.org/common/json_feed.html';
  donorsChooseDonationBaseURL = 'https://apiqasecure.donorschoose.org/common/json_api.html';
}

var DONATION_AMOUNT = (process.env.DONORSCHOOSE_DONATION_AMOUNT || 10)
  , COST_TO_COMPLETE_UPPER_LIMIT = 10000
  , DONATE_API_URL = donorsChooseDonationBaseURL + '?APIKey=' + donorsChooseApiKey
  , END_MESSAGE_DELAY = 2500;

var Q = require('q')
  , requestHttp = require('request')
  , Entities = require('html-entities').AllHtmlEntities
  , logger = rootRequire('app/lib/logger')
  , mobilecommons = rootRequire('mobilecommons')
  , smsHelper = rootRequire('app/lib/smsHelpers')
  , shortenLink = rootRequire('app/lib/bitly')
  , stringValidator = rootRequire('app/lib/string-validators')
  ;

var connectionOperations = rootRequire('app/config/connectionOperations')
  , donationModel = require('../models/DonationInfo')(connectionOperations)
  ;

var dcConfig = {
  msg_ask_email: "Rad, what's your email? the teacher would like to send a thank you.",
  msg_ask_first_name: "Rad, what's your first name?",
  msg_ask_zip: "Rad, let's find a project in or near ur town. What's ur zipcode?",
  msg_donation_success: "Because you played Science Sleuth, you're helping support STEM (science,tech,math & engineering) classes at ",
  msg_invalid_zip: "Whoops! C'mon now, that's not a valid zip code. Try again.",
  msg_max_donations: "Sorry, out of donations",
  msg_project_link: "You can find your name and updates on the project here: ",
}

function DonorsChooseDonationController() {
  this.resourceName; // Resource name identifier. Specifies controller to route. 
};

/**
 * Resource name identifier. Routes will use this to specify the controller to use.
 */
DonorsChooseDonationController.prototype.resourceName = 'donors-choose';

/**
 * Posts profile_update request to Mobile Commons to send messageText as SMS.
 *
 * @param {object} member The MoCo request.body sent, containing member info.
 * @param {number} optInPath
 * @param {string} messageText
 * @param {object|null} customFields Key/values to store as MoCo Custom Fields.
 */
function sendSMS(member, optInPath, messageText, customFields) {
  var mobileNumber = smsHelper.getNormalizedPhone(member.phone);
  // Save as slothbot_response MoCo custom field to display in Liquid via MoCo.
  if (typeof customFields === 'undefined') {
    customFields = {slothbot_response: messageText};
  }
  else {
    customFields.slothbot_response = messageText;
  }
  // ScienceSleuth Experiment campaign.
  // @see https://secure.mcommons.com/campaigns/146943/opt_in_paths/211133
  mobilecommons.profile_update(mobileNumber, optInPath, customFields);
}

/**
 * Sends SMS mesage and listens for a MoCo response.
 *
 * @see sendSMS(member, optInPath, messageText, customFields)
 */
function respondAndListen(member, messageText, customFields) {
  // Send to the chat OIP to listen for a member response to respond back to.
  sendSMS(member, 211133, messageText, customFields);
}

/**
 * Sends SMS message without listening for a MoCo response.
 *
 * @see sendSMS(member, optInPath, messageText, customFields)
 */
function respond(member, messageText, customFields) {
  // Send to OIP without mData, and no longer listen for member responses.
  sendSMS(member, 211195, messageText, customFields);
}

/**
 * Sends generic failure message as SMS without listening for a MoCo response.
 *
 * @see sendSMS(member, optInPath, messageText, customFields)
 */
function respondWithGenericFail(member) {
  sendSMS(member, 211195, "Oops, something's not right. Please try again l8r");
}

DonorsChooseDonationController.prototype.chat = function(request, response) {
  var member = request.body;
  logger.log('verbose', 'DonorsChoose.chat member:', member);
  response.send();

  var firstWord = null;
  if (request.body.args) {
    firstWord = smsHelper.getFirstWord(request.body.args);
  }
  logger.log('debug', 'DonorsChoose.chat phone:%s firstWord:%s', member.phone, firstWord);

  // @todo Sanity check that member donation count is not max

  if (!member.profile_postal_code) {
    if (!firstWord) {
      respondAndListen(member, dcConfig.msg_ask_zip);
      return;
    }
    if (!stringValidator.isValidZip(firstWord)) {
      respondAndListen(member, dcConfig.msg_invalid_zip);
      return;
    }
    respondAndListen(member, dcConfig.msg_ask_first_name, {postal_code: firstWord});
    return;
  }

  if (!member.profile_first_name) {
    if (!firstWord) {
      respondAndListen(member, dcConfig.msg_ask_first_name);
      return;
    }
    if (stringValidator.containsNaughtyWords(firstWord)) {
      respondAndListen(member, "Pls don't use that tone with me. " + dcConfig.msg_ask_first_name);
      return;
    }
    respondAndListen(member, dcConfig.msg_ask_email, {first_name: firstWord});
    return;
  }

  if (!member.profile_email_address) {
    if (!firstWord) {
      respondAndListen(member, dcConfig.msg_ask_email);
      return;
    }
    if (!stringValidator.isValidEmail(firstWord)) {
      respondAndListen(member, "Whoops, that's not a valid email address. " + dcConfig.msg_ask_email);
      return;
    }
    // @todo Does this ever get called?
    respondAndListen(member, "Looking for a project by you, just a moment...", {email_address: firstWord});

    setTimeout(function() {
      findProjectAndRespond(member);
    }, END_MESSAGE_DELAY);
    return;
  }

  findProjectAndRespond(member);
};

/**
 * Queries DonorsChoose API to find a STEM project by zip and sends the
 * project details back to the user.
 *
 * @see https://data.donorschoose.org/docs/project-listing/json-requests/
 *
 */
function findProjectAndRespond(member) {
  var mobileNumber = member.phone;
  var requestUrlString = donorsChooseProposalsQueryBaseURL;
  requestUrlString += '?subject4=-4'; 
  requestUrlString += '&sortBy=2'; 
  requestUrlString += '&costToCompleteRange=' + DONATION_AMOUNT + '+TO+' + COST_TO_COMPLETE_UPPER_LIMIT; 
  requestUrlString += '&max=1';
  requestUrlString += '&zip=' + member.profile_postal_code;
  logger.log('debug', 'DonorsChoose.findProject request:%s', requestUrlString);
  requestUrlString += '&APIKey=' + donorsChooseApiKey;

  requestHttp.get(requestUrlString, function(error, response, data) {
    if (error) {
      respondWithGenericFail(member);
      logger.error('DonorsChoose.findProject user:%s error:%s', mobileNumber, error);
      return;
    }

    try {
      var donorsChooseResponse = JSON.parse(data);
      if (!donorsChooseResponse.proposals || donorsChooseResponse.proposals.length == 0) {
        // If no proposals, could potentially prompt user for different zip code.
        // For now, send back error message per existing functionality.
        respond(member, "Hmm, no projects found.");
        logger.error('DonorsChoose.findProject API no proposals found for zip:%s user:%s', zip, mobileNumber);
        return;
      }
      var project = decodeDonorsChooseProposal(donorsChooseResponse.proposals[0]);
      sendSuccessMessages(member, project);
      // createDonationDoc(mobileNumber, donorsChooseResponse.proposals[0]);
    }
    catch (e) {
      respondWithGenericFail(member);
      // JSON.parse will throw a SyntaxError exception if data is not valid JSON
      logger.error('DonorsChoose.findProject invalid JSON data received from DonorsChoose API for user: ' 
        + mobileNumber + ' , or selected proposal does not contain necessary fields. Error: ' + e);
      return;
    }
  });
}

function decodeDonorsChooseProposal(proposal) {
  var entities = new Entities();
  return {
    id:proposal.id,
    description:  entities.decode(proposal.fulfillmentTrailer),
    location: entities.decode(proposal.city) + ', ' + entities.decode(proposal.state),
    schoolName: entities.decode(proposal.schoolName),
    teacherName: entities.decode(proposal.teacherName),
    url:proposal.proposalURL
  };
}

/**
 * Creates a donation_infos document for given mobileNumber and DonorsChoose project.
 * Opts user into next step in conversation upon success.
 */
function createDonationDoc(mobileNumber, selectedProposal) {
  var entities = new Entities(); // Calling 'html-entities' module to decode escaped characters.
  var location = entities.decode(selectedProposal.city) + ', ' + entities.decode(selectedProposal.state)

  // Email and first_name can be overwritten later. Included in case of error, transaction can still be completed. 
  var currentDonationInfo = {
    mobile: mobileNumber,
    email: 'donorschoose@dosomething.org', 
    first_name: 'Anonymous',
    location: location,
    project_id: selectedProposal.id,
    project_url: selectedProposal.proposalURL,
    donation_complete: false
  }

  // .profile_update call placed within the donationModel.create() callback to 
  // ensure that the ORIGINAL DOCUMENT IS CREATED before the user texts back 
  // their email address and attempts to find the document to be updated. 
  donationModel.create(currentDonationInfo).then(function(doc) {
    logger.log('debug', 'DonorsChoose.findProject created donation_infos document:%s for user:%s', JSON.stringify(doc), mobileNumber);
    var customFields = {
      SS_fulfillment_trailer:   entities.decode(selectedProposal.fulfillmentTrailer), 
      SS_teacher_name :         entities.decode(selectedProposal.teacherName), 
      SS_school_name :          entities.decode(selectedProposal.schoolName),
      SS_proj_location:         location
    };
    // @todo: Nice to have, shouldn't have to prompt for first name if already stored to profile.
    // @see https://github.com/DoSomething/gambit/issues/552 
    mobilecommons.profile_update(mobileNumber, donorsChooseConfig.oip_ask_first_name, customFields);
  }, promiseErrorCallback('DonorsChoose.findProject unable to create donation_infos document for user: ' + mobileNumber));
}

/**
 * Submits a donation transaction to Donors Choose.
 *
 * @see https://data.donorschoose.org/docs/transactions/
 *
 * @param donorInfoObject = {donorEmail: string, donorFirstName: string}
 * @param proposalId, the DonorsChoose proposal ID 
 *
 */
DonorsChooseDonationController.prototype.submitDonation = function(donorInfoObject, proposalId) {
  var donorPhone = donorInfoObject.donorPhoneNumber;
  logger.log('debug', 'DonorsChoose.submitDonation user:%s amount:%s info:%s proposal:%s', donorPhone, DONATION_AMOUNT, JSON.stringify(donorInfoObject), proposalId);

  requestToken().then(requestDonation,
    promiseErrorCallback('DonorsChoose.submitDonation failed for user:' + donorPhone)
  );

  /**
   * First request: obtains a unique token for the donation.
   */
  function requestToken() {
    // Creates promise-storing object.
    var deferred = Q.defer();
    var retrieveTokenParams = { 'form': {
      'APIKey': donorsChooseApiKey,
      'apipassword': donorsChooseApiPassword, 
      'action': 'token'
    }}
    logger.log('debug', 'DonorsChoose.requestToken user:%s', donorPhone);
    requestHttp.post(DONATE_API_URL, retrieveTokenParams, function(err, response, body) {
      if (!err) {
        try {
          var jsonBody = JSON.parse(body);
          if (jsonBody.statusDescription == 'success') {
            logger.log('debug', 'DonorsChoose.requestToken success user:%s', donorPhone);
            deferred.resolve(JSON.parse(body).token);
          }
          else {
            logger.error('DonorsChoose.requestToken statusDescription!=success user:%s', donorPhone);
            mobilecommons.profile_update(donorPhone, donorsChooseConfig.oip_error);
          }
        }
        catch (e) {
          logger.error('DonorsChoose.requestToken failed user:'  + donorPhone + ' error:' + JSON.stringify(error));
          mobilecommons.profile_update(donorPhone, donorsChooseConfig.oip_error);
        }
      }
      else {
        deferred.reject('DonorsChoose.requestToken error user: ' + donorPhone + 'error: ' + JSON.stringify(err));
        mobilecommons.profile_update(donorPhone, donorsChooseConfig.oip_error);
      }
    });
    return deferred.promise;
  }

  /**
   * After promise we make the second request: donation transaction.
   */
  function requestDonation(tokenData) {
    var donateParams = {'form': {
      'APIKey': donorsChooseApiKey,
      'apipassword': donorsChooseApiPassword, 
      'action': 'donate',
      'token': tokenData,
      'proposalId': proposalId,
      'amount': DONATION_AMOUNT,
      'email': defaultDonorsChooseTransactionEmail,
      'honoreeEmail': donorInfoObject.donorEmail,
      'honoreeFirst': donorInfoObject.donorFirstName,
    }};

    logger.log('debug', 'DonorsChoose.requestDonation POST user:' + donorInfoObject.donorPhoneNumber + ' proposalId:' + proposalId + ' amount:' + DONATION_AMOUNT + ' honoreeEmail:%s honoreeFirst:%s', donorInfoObject.donorEmail, donorInfoObject.donorFirstName);
    requestHttp.post(DONATE_API_URL, donateParams, function(err, response, body) {
      if (err) {
        logger.error('DonorsChoose.requestDonation requestHttp error user:' + donorInfoObject.donorPhoneNumber + 'error: ' + err);
        mobilecommons.profile_update(donorPhone,  donorsChooseConfig.oip_error);
      }
      else if (response && response.statusCode != 200) {
        logger.error('DonorsChoose.requestDonation response.statusCode:%s for user:%s', response.statusCode, donorInfoObject.donorPhoneNumber);
        mobilecommons.profile_update(donorPhone, donorsChooseConfig.oip_error);
      }
      else {
        try {
          var jsonBody = JSON.parse(body);
          if (jsonBody.statusDescription == 'success') {
            logger.info('DonorsChoose.requestDonation success user:' + donorPhone + ' proposalId:' + proposalId + ' body:', jsonBody);
            sendSuccessMessages(donorPhone, jsonBody.proposalURL);
          }
          else {
            logger.error('DonorsChoose.requestDonation failed user:' + donorPhone + ' proposalId:' + proposalId + ' body:', jsonBody);
            mobilecommons.profile_update(donorPhone, donorsChooseConfig.oip_error);
          }
        }
        catch (e) {
          logger.error('DonorsChoose.requestDonation catch exception for user:%s e:%s', donorPhone, e.message);
          mobilecommons.profile_update(donorPhone, donorsChooseConfig.oip_error);
        }
      }
    })
  }
};

/**
 * Sends multiple messages to user after a successful donation.
 *
 * @param project
 *   Decoded DonorsChoose proposal object.
 */
function sendSuccessMessages(member, project) {
  logger.log('debug', 'DonorsChoose.sendSuccessMessages user:%s project%s', member.phone, project);

  var firstMessage = dcConfig.msg_donation_success + project.schoolName + ".";
  respondAndListen(member, firstMessage);

  setTimeout(function() {
    var secondMessage = '@' + project.teacherName + ': Thanks! ' + project.description;
    respondAndListen(member, secondMessage);
  }, END_MESSAGE_DELAY);

  setTimeout(function() {
    shortenLink(project.url, function(shortenedLink) {
      logger.log('debug', 'DonorsChoose.sendSuccessMessages user:%s shortenedLink:%s', member.phone, shortenedLink);
      var thirdMessage = dcConfig.msg_project_link + shortenedLink;
      respond(member, thirdMessage);
    });
  }, 2 * END_MESSAGE_DELAY);
}


/**
 * The following two functions are for handling Mongoose Promise chain errors.
 */
function promiseErrorCallback(message, member) {
  return onPromiseErrorCallback.bind({message: message, member: member});
}

function onPromiseErrorCallback(err) {
  if (err) {
    logger.error(this.message + '\n', err.stack);
    respondWithGenericFail(this.member);
  }
}

module.exports = DonorsChooseDonationController;
