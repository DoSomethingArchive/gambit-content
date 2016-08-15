"use strict";

/**
 * Submits a donation to DonorsChoose.org on behalf of a MoCo member.
 * Currently only used for Science Sleuth.
 */
var donorsChooseApiKey = (process.env.DONORSCHOOSE_API_KEY || null);
var donorsChooseApiPassword = (process.env.DONORSCHOOSE_API_PASSWORD || null);
var donorsChooseProposalsHost = 'https://api.donorschoose.org/';
var donorsChooseDonationsHost = 'https://apisecure.donorschoose.org/';

if (process.env.NODE_ENV != 'production') {
  donorsChooseApiKey = 'DONORSCHOOSE';
  donorsChooseApiPassword = 'helpClassrooms!';
  donorsChooseProposalsHost = 'https://qa.donorschoose.org/';
  donorsChooseDonationsHost = 'https://apiqasecure.donorschoose.org/';
}

var DONATION_AMOUNT = (process.env.DONORSCHOOSE_DONATION_AMOUNT || 10);
var COST_TO_COMPLETE_UPPER_LIMIT = 10000
var DONATE_API_URL = donorsChooseDonationsHost + 'common/json_api.html?APIKey=' + donorsChooseApiKey;
var END_MESSAGE_DELAY = 2500;

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
var donationModel = require('../models/donorsChooseDonationModel')(connectionOperations);

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
  var self = this;
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
      self.chat(member, self.dcConfig.msg_ask_zip);
      return;
    }
    if (!stringValidator.isValidZip(firstWord)) {
      self.chat(member, self.dcConfig.msg_invalid_zip);
      return;
    }
    self.chat(member, self.dcConfig.msg_ask_first_name, {postal_code: firstWord});
    return;
  }

  if (!member.profile_first_name) {
    if (!firstWord) {
      self.chat(member, self.dcConfig.msg_ask_first_name);
      return;
    }
    if (stringValidator.containsNaughtyWords(firstWord)) {
      self.chat(member, "Pls don't use that tone with me. " + self.dcConfig.msg_ask_first_name);
      return;
    }
    self.chat(member, self.dcConfig.msg_ask_email, {first_name: firstWord});
    return;
  }

  if (!member.profile_email) {
    if (!firstWord) {
      self.chat(member, self.dcConfig.msg_ask_email);
      return;
    }
    if (!stringValidator.isValidEmail(firstWord)) {
      self.chat(member, "Whoops, that's not a valid email address. " + self.dcConfig.msg_ask_email);
      return;
    }
    // @todo Does this ever get called?
    self.chat(member, "Looking for a project by you, just a moment...",
      {email_address: firstWord});

    setTimeout(function() {
      findProjectAndRespond(member);
    }, END_MESSAGE_DELAY);
    return;
  }

  self.findProjectAndRespond(member);
};

/**
 * Queries DonorsChoose API to find a STEM project by zip and sends the
 * project details back to the user.
 *
 * @see https://data.donorschoose.org/docs/project-listing/json-requests/
 *
 */
DonorsChooseDonationController.prototype.findProjectAndRespond = function(member) {
  var self = this;

  logger.log('debug', 'dc.findProjectAndRespond user:%s zip:%s', member.phone,
    member.profile_postal_code);
  var mobileNumber = member.phone;
  var zip = member.profile_postal_code;

  var requestUrlString = donorsChooseProposalsHost + 'common/json_feed.html';
  requestUrlString += '?subject4=-4'; 
  requestUrlString += '&sortBy=2'; 
  requestUrlString += '&costToCompleteRange=' + DONATION_AMOUNT + '+TO+' + COST_TO_COMPLETE_UPPER_LIMIT; 
  requestUrlString += '&max=1';
  requestUrlString += '&zip=' + zip;
  logger.log('debug', 'dc.findProject user:%s request:%s', member.phone, 
    requestUrlString);
  requestUrlString += '&APIKey=' + donorsChooseApiKey;

  requestHttp.get(requestUrlString, function(error, response, body) {
    if (error) {
      logger.error('dc.findProject user:%s get error:%s', mobileNumber, error);
      self.endChatWithFail(member);
      return;
    }

    try {
      var dcResponse = JSON.parse(body);
      if (!dcResponse.proposals || dcResponse.proposals.length == 0) {
        // If no proposals, could potentially prompt user to try different zip.
        // For now, send back error message per existing functionality.
        self.endChat(member, "Hmm, no projects found. Try again later.");
        logger.error('dc.findProject no results for zip:%s user:%s', zip, 
          mobileNumber);
        return;
      }
      // When DC API is down, it sends html as response.
      else if (typeof dcResponse !== 'object') {
        self.endChatWithFail;
        logger.error('dc.findProject user:%s invalid JSON.', mobileNumber);
        return;
      }
      var project = decodeDonorsChooseProposal(dcResponse.proposals[0]);
      self.postDonation(member, project);
    }
    catch (e) {
      self.endChatWithFail(member);
      logger.error('ds.findProject user:%s e:%s', mobileNumber, e); 
      return;
    }
  });
}

function decodeDonorsChooseProposal(proposal) {
  var entities = new Entities();
  return {
    id: proposal.id,
    description: entities.decode(proposal.fulfillmentTrailer),
    city: entities.decode(proposal.city),
    state: entities.decode(proposal.state),
    schoolName: entities.decode(proposal.schoolName),
    teacherName: entities.decode(proposal.teacherName),
    url: proposal.proposalURL
  };
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
  var self = this;
  var donorPhone = member.phone;
  logger.log('debug', 'dc.submitDonation user:%s proposalId:%s', 
    donorPhone, project.id);

  requestToken().then(postDonation,
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
    logger.log('debug', 'dc.requestToken POST %s user:%s', DONATE_API_URL, donorPhone);
    requestHttp.post(DONATE_API_URL, retrieveTokenParams, function(err, response, body) {
      if (!err) {
        try {
          logger.log('verbose', 'dc.requestToken POST user:%s body:%s', 
            donorPhone, body);
          // Handles when we get 403/Forbidden but steps in when sufficient funds.
          // if (typeof body !== 'object') {
          //   self.endChatWithFail(member);
          //   logger.error('dc.requestToken user:%s invalid body:%s', donorPhone, body);
          //   return deferred.promise;
          // }
          var jsonBody = JSON.parse(body);
          if (jsonBody.statusDescription === 'success') {
            logger.log('debug', 'dc.requestToken success user:%s', donorPhone);
            deferred.resolve(JSON.parse(body).token);
          }
          else {
            logger.error('dc.requestToken failed user:%s body:%s', donorPhone, jsonBody);
            self.endChatWithFail(member);
          }
        }
        catch (e) {
          logger.error('dc.requestToken failed user:'  + donorPhone + ' error:' + JSON.stringify(e));
          self.endChatWithFail(member);
        }
      }
      else {
        deferred.reject('dc.requestToken error user: ' + donorPhone + 'error: ' + JSON.stringify(err));
        self.endChatWithFail(member);
      }
    });
    return deferred.promise;
  }

  /**
   * After promise we make the second request: donation transaction.
   */
  function postDonation(tokenData) {
    logger.log('debug', 'dc.postDonation POST user:%s proposalId:%s email:%s first:%s', 
      donorPhone, project.id, member.profile_email, member.profile_first_name);
    var email = (process.env.DONORSCHOOSE_DEFAULT_EMAIL || 'donorschoose@dosomething.org');
    var donateFormParams = {'form': {
      'APIKey': donorsChooseApiKey,
      'apipassword': donorsChooseApiPassword, 
      'action': 'donate',
      'token': tokenData,
      'proposalId': project.id,
      'amount': DONATION_AMOUNT,
      'email': email,
      'honoreeEmail': member.profile_email,
      'honoreeFirst': member.profile_first_name,
    }};
    requestHttp.post(DONATE_API_URL, donateFormParams, function(err, response, body) {
      if (err) {
        logger.error('dc.postDonation POST user:%s error:%s',
          member.phone, error);
        self.endChatWithFail(member);
      }
      else if (response && response.statusCode != 200) {
        logger.error('dc.postDonation response.statusCode:%s for user:%s', 
          response.statusCode, member.phone); 
      }
      else {
        try {
          var jsonBody = JSON.parse(body);
          if (jsonBody.statusDescription === 'success') {
            var logMsg = 'dc.postDonation POST success user:' + donorPhone;
            logMsg += ' proposalId:' + project.id;
            logMsg += ' donationId:' + jsonBody.donationId;
            logger.info(logMsg);
            logger.log('debug', jsonBody);
            createDonationDoc(jsonBody);
            self.respondWithSuccess(member, project);
            return;
          }
          else {
            var logMsg = 'dc.postDonation POST failed user:' + donorPhone;
            logMsg += ' proposalId:' + project.id;
            logMsg += ' body:' + JSON.stringify(jsonBody);
            logger.error(logMsg);
          }
        }
        catch (e) {
          logger.error('dc.postDonation catch exception for user:%s e:%s', donorPhone, e.message);
        }
      }
      self.endChatWithFail(member);
    });

    function createDonationDoc(donation) {
      var donationLogData = {
        mobile: member.phone,
        email: member.profile_email,
        first_name: member.profile_first_name,
        postal_code: member.profile_postal_code,
        proposal_id: project.id,
        donation_id: donation.donationId,
        donation_amount: DONATION_AMOUNT,
        remaining_amount: donation.remainingProposalAmount,
        school_name: project.schoolName,
        school_city: project.city,
        school_state: project.state,
        url: project.url
      };
      donationModel.create(donationLogData).then(function(doc) {
        logger.log('debug', 'dc.createDonationDoc success:%s', donation);
      }, promiseErrorCallback('dc.createDonationDoc user: ' + member.phone));
    };
  }
};

/**
 * Sends multiple messages to user after a successful donation.
 *
 * @param project
 *   Decoded DonorsChoose proposal object.
 */
DonorsChooseDonationController.prototype.respondWithSuccess = function(member, project) {
  var self = this;
  logger.log('debug', 'dc.respondWithSuccess user:%s project%s', 
    member.phone, project);

  var donationCount = parseInt(member['profile_' + DONATION_COUNT_FIELDNAME]);
  var customFields = {};
  customFields[DONATION_COUNT_FIELDNAME] = donationCount + 1;

  var firstMessage = self.dcConfig.msg_donation_success + project.schoolName + ".";
  self.endChat(member, firstMessage);

  setTimeout(function() {
    var secondMessage = '@' + project.teacherName + ': Thx! ' + project.description;
    self.endChat(member, secondMessage);
  }, END_MESSAGE_DELAY);

  setTimeout(function() {
    shortenLink(project.url, function(shortenedLink) {
      logger.log('debug', 'dc.sendSuccessMessages user:%s shortenedLink:%s', 
        member.phone, shortenedLink);
      var thirdMessage = self.dcConfig.msg_project_link + shortenedLink;
      self.endChat(member, thirdMessage, customFields);
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
//    this.endChatWithFail(this.member);
  }
}

module.exports = DonorsChooseDonationController;
