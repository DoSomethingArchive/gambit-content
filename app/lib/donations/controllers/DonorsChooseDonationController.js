"use strict";

/**
 * Submits a donation to DonorsChoose.org on behalf of a MoCo member.
 * Currently only used for Science Sleuth.
 */
var donorsChooseApiKey = (process.env.DONORSCHOOSE_API_KEY || 'DONORSCHOOSE')
  , donorsChooseApiPassword = (process.env.DONORSCHOOSE_API_PASSWORD || 'helpClassrooms!')
  , donorsChooseDonationBaseURL = 'https://apisecure.donorschoose.org/common/json_api.html?'
  , donorsChooseProposalsQueryBaseURL = 'https://api.donorschoose.org/common/json_feed.html'
  , defaultDonorsChooseTransactionEmail = (process.env.DONORSCHOOSE_DEFAULT_EMAIL || 'donorschoose@dosomething.org');

if (process.env.NODE_ENV != 'production') {
  donorsChooseProposalsQueryBaseURL = 'https://qa.donorschoose.org/common/json_feed.html';
  donorsChooseDonationBaseURL = 'https://apiqasecure.donorschoose.org/common/json_api.html';
}

var DONATION_AMOUNT = (process.env.DONORSCHOOSE_DONATION_AMOUNT || 10)
  , COST_TO_COMPLETE_UPPER_LIMIT = 10000
  , DONATE_API_URL = donorsChooseDonationBaseURL + '?APIKey=' + donorsChooseApiKey
  , END_MESSAGE_DELAY = 2500;

// Name of MoCo Custom Field used to store member's number of donations.
var DONATION_COUNT_FIELDNAME = 'ss2016_donation_count';

var Q = require('q')
  , requestHttp = require('request')
  , Entities = require('html-entities').AllHtmlEntities
  , logger = rootRequire('app/lib/logger')
  , mobilecommons = rootRequire('mobilecommons')
  , smsHelper = rootRequire('app/lib/smsHelpers')
  , shortenLink = rootRequire('app/lib/bitly')
  , stringValidator = rootRequire('app/lib/string-validators')
  ;

var connectionOperations = rootRequire('app/config/connectionOperations');
var donationModel = require('../models/DonationInfo')(connectionOperations);

function DonorsChooseDonationController() {
  var mocoCampaignId = process.env.DONORSCHOOSE_MOCO_CAMPAIGN_ID;
  this.dcConfig = app.getConfig(app.ConfigName.DONORSCHOOSE, mocoCampaignId); 
};

/**
 * Sends SMS mesage and listens for a MoCo response.
 *
 * @see sendSMS(member, optInPath, messageText, customFields)
 */
DonorsChooseDonationController.prototype.chat = function(member, msgText, profileFields) {
  sendSMS(member, this.dcConfig.oip_chat, msgText, profileFields);
}

/**
 * Sends SMS message and ends conversation.
 *
 * @see sendSMS(member, optInPath, messageText, customFields)
 */
DonorsChooseDonationController.prototype.endChat = function(member, msgText, profileFields) {
  sendSMS(member, this.dcConfig.oip_end_chat, msgText, profileFields);
}

/**
 * Sends SMS message with generic failure text and ends conversation.
 */
DonorsChooseDonationController.prototype.endChatWithFail = function(member) {
  this.endChat(member, this.dcConfig.msg_error_generic);
}

DonorsChooseDonationController.prototype.chatbot = function(request, response) {
  var member = request.body;
  logger.log('verbose', 'dc.chat member:', member);
  response.send();

  // @todo Add sanity check to make sure this.dcConfig exists

  var firstWord = null;
  if (request.body.args) {
    firstWord = smsHelper.getFirstWord(request.body.args);
  }
  logger.log('debug', 'dc.chat user:%s firstWord:%s', member.phone, firstWord);

  // @todo Could add sanity check in code that member donation count is not max.
  // Planning to rely on Liquid logic within Start OIP conversation.

  // @todo Liquid in Start OIP will need to match sequence we check here

  if (!member.profile_postal_code) {
    if (!firstWord) {
      this.chat(member, this.dcConfig.msg_ask_zip);
      return;
    }
    if (!stringValidator.isValidZip(firstWord)) {
      this.chat(member, this.dcConfig.msg_invalid_zip);
      return;
    }
    this.chat(member, this.dcConfig.msg_ask_first_name, {postal_code: firstWord});
    return;
  }

  if (!member.profile_first_name) {
    if (!firstWord) {
      this.chat(member, this.dcConfig.msg_ask_first_name);
      return;
    }
    if (stringValidator.containsNaughtyWords(firstWord)) {
      this.chat(member, "Pls don't use that tone with me. " + this.dcConfig.msg_ask_first_name);
      return;
    }
    this.chat(member, this.dcConfig.msg_ask_email, {first_name: firstWord});
    return;
  }

  if (!member.profile_email_address) {
    if (!firstWord) {
      this.chat(member, this.dcConfig.msg_ask_email);
      return;
    }
    if (!stringValidator.isValidEmail(firstWord)) {
      this.chat(member, "Whoops, that's not a valid email address. " + this.dcConfig.msg_ask_email);
      return;
    }
    // @todo Does this ever get called?
    this.chat(member, "Looking for a project by you, just a moment...", {email_address: firstWord});

    setTimeout(function() {
      findProjectAndRespond(member);
    }, END_MESSAGE_DELAY);
    return;
  }

  this.findProjectAndRespond(member);
};

/**
 * Queries DonorsChoose API to find a STEM project by zip and sends the
 * project details back to the user.
 *
 * @see https://data.donorschoose.org/docs/project-listing/json-requests/
 *
 */
DonorsChooseDonationController.prototype.findProjectAndRespond = function(member) {
  var mobileNumber = member.phone;
  var zip = member.profile_postal_code;
  var requestUrlString = donorsChooseProposalsQueryBaseURL;
  requestUrlString += '?subject4=-4'; 
  requestUrlString += '&sortBy=2'; 
  requestUrlString += '&costToCompleteRange=' + DONATION_AMOUNT + '+TO+' + COST_TO_COMPLETE_UPPER_LIMIT; 
  requestUrlString += '&max=1';
  requestUrlString += '&zip=' + zip;
  logger.log('debug', 'dc.findProject request:%s', requestUrlString);
  requestUrlString += '&APIKey=' + donorsChooseApiKey;

  requestHttp.get(requestUrlString, function(error, response, data) {
    if (error) {
      this.endChatWithFail(member);
      logger.error('dc.findProject user:%s error:%s', mobileNumber, error);
      return;
    }

    try {
      var dcResponse = JSON.parse(data);
      if (!dcResponse.proposals || dcResponse.proposals.length == 0) {
        // If no proposals, could potentially prompt user to try different zip.
        // For now, send back error message per existing functionality.
        this.endChat(member, "Hmm, no projects found. Try again later.");
        logger.error('dc.findProject no results for zip:%s user:%s', zip, 
          mobileNumber);
        return;
      }
      var project = decodeDonorsChooseProposal(dcResponse.proposals[0]);
      this.postDonation(member, project);
    }
    catch (e) {
      this.endChatWithFail(member);
      logger.error('ds.findProject user:%s error:%s', mobileNumber, e); 
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
    logger.log('debug', 'dc.findProject created donation_infos document:%s for user:%s', JSON.stringify(doc), mobileNumber);
    var customFields = {
      SS_fulfillment_trailer:   entities.decode(selectedProposal.fulfillmentTrailer), 
      SS_teacher_name :         entities.decode(selectedProposal.teacherName), 
      SS_school_name :          entities.decode(selectedProposal.schoolName),
      SS_proj_location:         location
    };
    // @todo: Nice to have, shouldn't have to prompt for first name if already stored to profile.
    // @see https://github.com/DoSomething/gambit/issues/552 
    mobilecommons.profile_update(mobileNumber, donorsChooseConfig.oip_ask_first_name, customFields);
  }, promiseErrorCallback('dc.findProject unable to create donation_infos document for user: ' + mobileNumber));
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
DonorsChooseDonationController.prototype.postDonation = function(member, project) {
  var donorPhone = member.phone;
  logger.log('debug', 'dc.submitDonation user:%s proposalId:%s', 
    donorPhone, project.id);

  requestToken().then(requestDonation,
    promiseErrorCallback('dc.submitDonation failed for user:' + donorPhone)
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
    logger.log('debug', 'dc.requestToken POST user:%s', donorPhone);
    requestHttp.post(DONATE_API_URL, retrieveTokenParams, function(err, response, body) {
      if (!err) {
        try {
          var jsonBody = JSON.parse(body);
          if (jsonBody.statusDescription === 'success') {
            logger.log('debug', 'dc.requestToken success user:%s', donorPhone);
            deferred.resolve(JSON.parse(body).token);
          }
          else {
            logger.error('dc.requestToken statusDescription!=success user:%s', donorPhone);
            this.endChatWithFail(member);
          }
        }
        catch (e) {
          logger.error('dc.requestToken failed user:'  + donorPhone + ' error:' + JSON.stringify(error));
          this.endChatWithFail(member);
        }
      }
      else {
        deferred.reject('dc.requestToken error user: ' + donorPhone + 'error: ' + JSON.stringify(err));
        this.endChatWithFail(member);
      }
    });
    return deferred.promise;
  }

  /**
   * After promise we make the second request: donation transaction.
   */
  function requestDonation(tokenData) {
    logger.log('debug', 'dc.requestDonation POST user:%s proposalId:%s email:%s first:%s', 
      donorPhone, project.id, member.profile_email, member.profile_first_name);
    var donateFormParams = {'form': {
      'APIKey': donorsChooseApiKey,
      'apipassword': donorsChooseApiPassword, 
      'action': 'donate',
      'token': tokenData,
      'proposalId': project.id,
      'amount': DONATION_AMOUNT,
      'email': defaultDonorsChooseTransactionEmail,
      'honoreeEmail': member.profile_email,
      'honoreeFirst': member.profile_first_name,
    }};
    requestHttp.post(DONATE_API_URL, donateFormParams, function(err, response, body) {
      if (err) {
        logger.error('dc.requestDonation POST user:%s error:%s',
          member.phone, error);
        this.endChatWithFail(member);
      }
      else if (response && response.statusCode != 200) {
        logger.error('dc.requestDonation response.statusCode:%s for user:%s', 
          response.statusCode, member.phone); 
      }
      else {
        try {
          var jsonBody = JSON.parse(body);
          if (jsonBody.statusDescription === 'success') {
            logger.info('dc.requestDonation success user:' + donorPhone + ' proposalId:' + project.id + ' body:', jsonBody);
            this.respondWithSuccess(member, project);
            return;
          }
          else {
            logger.error('dc.requestDonation failed user:' + donorPhone + ' proposalId:' + project.id + ' body:', jsonBody);
          }
        }
        catch (e) {
          logger.error('dc.requestDonation catch exception for user:%s e:%s', donorPhone, e.message);
        }
      }
      this.endChatWithFail(member);
    });
  }
};

/**
 * Sends multiple messages to user after a successful donation.
 *
 * @param project
 *   Decoded DonorsChoose proposal object.
 */
DonorsChooseDonationController.prototype.respondWithSuccess = function(member, project) {
  logger.log('debug', 'dc.respondWithSuccess user:%s project%s', 
    member.phone, project);

  var donationCount = parseInt(member['profile_' + DONATION_COUNT_FIELDNAME]);
  var customFields = {};
  customFields[DONATION_COUNT_FIELDNAME] = donationCount + 1;

  var firstMessage = this.dcConfig.msg_donation_success + project.schoolName + ".";
  this.endChat(member, firstMessage);

  setTimeout(function() {
    var secondMessage = '@' + project.teacherName + ': Thx! ' + project.description;
    this.endChat(member, secondMessage);
  }, END_MESSAGE_DELAY);

  setTimeout(function() {
    shortenLink(project.url, function(shortenedLink) {
      logger.log('debug', 'dc.sendSuccessMessages user:%s shortenedLink:%s', 
        member.phone, shortenedLink);
      var thirdMessage = this.dcConfig.msg_project_link + shortenedLink;
      this.endChat(member, thirdMessage, customFields);
    });
  }, 2 * END_MESSAGE_DELAY);
}

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
  mobilecommons.profile_update(mobileNumber, optInPath, customFields);
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
    this.endChatWithFail(this.member);
  }
}

module.exports = DonorsChooseDonationController;
