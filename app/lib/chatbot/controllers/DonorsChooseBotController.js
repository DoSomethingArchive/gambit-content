"use strict";

/**
 * Submits a donation to DonorsChoose.org on behalf of a MoCo member.
 * Currently only supports running one DonorsChoose Donation Campaign at a time,
 * set by the DONORSCHOOSE_MOCO_CAMPAIGN_ID environment variable.
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
var DONATION_COUNT_FIELDNAME = 'ss2016_donation_count';
var DONORSCHOOSE_BOT_ID = process.env.DONORSCHOOSE_BOT_ID;
var MAX_DONATIONS_ALLOWED = (process.env.DONORSCHOOSE_MAX_DONATIONS_ALLOWED || 5);
var MOCO_CAMPAIGN_ID = process.env.DONORSCHOOSE_MOCO_CAMPAIGN_ID;

var Q = require('q');
var requestHttp = require('request');
var Entities = require('html-entities').AllHtmlEntities
var logger = rootRequire('lib/logger');
var mobilecommons = rootRequire('lib/mobilecommons');
var shortenLink = rootRequire('lib/bitly');
var helpers = rootRequire('lib/helpers');
var connectionOperations = rootRequire('app/config/connectionOperations');
var donationModel = require('../models/donorsChooseDonationModel')(connectionOperations);

/**
 * DonorsChooseBotController
 * @constructor
 */
function DonorsChooseBotController() {
  this.mocoCampaign = app.getConfig(app.ConfigName.DONORSCHOOSE, MOCO_CAMPAIGN_ID);
  this.bot = app.getConfig(app.ConfigName.DONORSCHOOSE_BOTS, DONORSCHOOSE_BOT_ID);
};

/**
 * Sends SMS mesage and listens for a MoCo response.
 * @param {object} member - MoCo request.body
 * @param {string} msgText
 * @param {object} profileFields - key/value MoCo Custom Fields to update
 */
DonorsChooseBotController.prototype.chat = function(member, msgText, profileFields) {
  sendSMS(member, this.mocoCampaign.oip_chat, msgText, profileFields);
}

/**
 * Sends SMS message and ends conversation.
 * @param {object} member - MoCo request.body
 * @param {string} msgText
 * @param {object} profileFields - key/value MoCo Custom Fields to update
 */
DonorsChooseBotController.prototype.endChat = function(member, msgText, profileFields) {
  sendSMS(member, this.mocoCampaign.oip_success, msgText, profileFields);
}

/**
 * Sends SMS message with generic failure text and ends conversation.
 * @param {object} member - MoCo request.body
 */
DonorsChooseBotController.prototype.endChatWithFail = function(member) {
  sendSMS(member, this.mocoCampaign.oip_error, this.bot.msg_error_generic);
}

/**
 * Responds to DonorsChoose Donation requests sent from MoCo mData's.
 * @param {object} request - Express request
 * @param {object} response - Express response
 */
DonorsChooseBotController.prototype.chatbot = function(request, response) {
  var self = this;
  var member = request.body;
  logger.log('verbose', 'dc.chat member:', member);

  if (!this.bot || !this.mocoCampaign) {
    response.sendStatus(500);
    return;
  }
  response.send();
  var firstWord = null;

  // Start query parameter is used to start conversation and wait for response.
  if (request.query.start) {
    logger.log('debug', 'dc.chat user:%s start', member.phone);
  }
  // Otherwise inspect message that the member has sent back.
  else if (request.body.args) {
    firstWord = smsHelper.getFirstWord(request.body.args);
    logger.log('debug', 'dc.chat user:%s firstWord:%s', member.phone, firstWord);
  }
  else {
    logger.log('warn', 'dc.chat user:%s no start, no args');
  }

  if (getDonationCount(member) >= MAX_DONATIONS_ALLOWED) {
    logger.log('info', 'dc.chat msg_max_donations_reached user:%s', 
      member.phone);
    self.endChat(member, self.bot.msg_max_donations_reached);
    return;
  }

  if (!member.profile_postal_code) {

    if (!firstWord) {
      self.chat(member, self.bot.msg_ask_zip);
      return;
    }

    if (!helpers.isValidZip(firstWord)) {
      self.chat(member, self.bot.msg_invalid_zip);
      return;
    }

    self.chat(member, self.bot.msg_ask_first_name,
      {postal_code: firstWord});
    return;

  }

  if (!member.profile_first_name) {

    if (!firstWord) {
      self.chat(member, self.bot.msg_ask_first_name);
      return;
    }

    if (helpers.containsNaughtyWords(firstWord)) {
      self.chat(member, self.bot.msg_invalid_first_name);
      return;
    }

    self.chat(member, self.bot.msg_ask_email, {first_name: firstWord});
    return;

  }

  if (!member.profile_email) {

    if (!firstWord) {
      self.chat(member, self.bot.msg_ask_email);
      return;
    }

    if (!helpers.isValidEmail(firstWord)) {
      self.chat(member, self.bot.msg_invalid_email);
      return;
    }

    self.findProjectAndRespond(member, firstWord);
    return;

  }

  self.findProjectAndRespond(member);
};

/**
 * Queries DonorsChoose API to find a project, donate to it, and respond back.
 * @param {object} member
 * @param {string} [email] - If passed, save email to profile.
 */
DonorsChooseBotController.prototype.findProjectAndRespond = function(member, email) {
  var self = this;
  logger.log('debug', 'dc.findProjectAndRespond user:%s zip:%s email:%s', member.phone,
    member.profile_postal_code, email);

  if (typeof email === 'string') {
    // We'll need member.profile_email later when we write donation document.
    member.profile_email = email.toLowerCase();
    self.endChat(member, this.bot.msg_search_start, {email: member.profile_email});
  }
  else {
    self.endChat(member, this.bot.msg_search_start);
  }

  var phone = member.phone;
  var zip = member.profile_postal_code;
  var apiUrl = getDonorsChooseProposalsQueryURL(zip);
  logger.log('debug', 'dc.findProject user:%s request:%s', phone, apiUrl);
  apiUrl += '&APIKey=' + donorsChooseApiKey;

  requestHttp.get(apiUrl, function(error, response, body) {
    if (error) {
      logger.error('dc.findProject user:%s get error:%s', phone, error);
      self.endChatWithFail(member);
      return;
    }

    try {
      var dcResponse = JSON.parse(body);
      if (!dcResponse.proposals || dcResponse.proposals.length == 0) {
        // If no proposals, could potentially prompt user to try different zip.
        // For now, send back error message per existing functionality.
        self.endChat(member, this.bot.msg_search_no_results);
        logger.error('dc.findProject no results for zip:%s user:%s', zip, 
          phone);
        return;
      }
      // When DC API is down, it sends html as response.
      else if (typeof dcResponse !== 'object') {
        self.endChatWithFail;
        logger.error('dc.findProject user:%s invalid JSON.', phone);
        return;
      }
      var project = decodeDonorsChooseProposal(dcResponse.proposals[0]);
      self.postDonation(member, project);
    }
    catch (e) {
      self.endChatWithFail(member);
      logger.error('ds.findProject user:%s e:%s', phone, e); 
      return;
    }
  });
}

/**
 * Posts donation to DonorsChoose API for given project, behalf of given member.
 * @param {object} member
 * @param {object} project
 */
DonorsChooseBotController.prototype.postDonation = function(member, project) {
  var self = this;
  var donorPhone = member.phone;
  logger.log('debug', 'dc.submitDonation user:%s proposalId:%s', 
    donorPhone, project.id);

  var apiUrl = donorsChooseDonationsHost + 'common/json_api.html?APIKey=';
  apiUrl += donorsChooseApiKey;
  requestToken().then(postDonation,
    promiseErrorCallback('dc.submitDonation failed for user:' + donorPhone)
  );

  /**
   * First request: obtain a unique token for the donation.
   * @see https://data.donorschoose.org/docs/transactions/
   */
  function requestToken() {
    // Creates promise-storing object.
    var deferred = Q.defer();
    var retrieveTokenParams = { 'form': {
      'APIKey': donorsChooseApiKey,
      'apipassword': donorsChooseApiPassword, 
      'action': 'token'
    }}
    logger.log('debug', 'dc.requestToken POST %s user:%s', apiUrl, donorPhone);
    requestHttp.post(apiUrl, retrieveTokenParams, function(err, response, body) {
      if (!err) {
        try {
          logger.log('verbose', 'dc.requestToken POST user:%s body:%s', 
            donorPhone, body);
          // Aimed to log HTML we get back from DonorsChoose errors:
          // @see https://github.com/DoSomething/gambit/pull/580#discussion-diff-75017991
          // if (typeof body !== 'object') {
          //   logger.error('dc.requestToken user:%s invalid JSON:%s', donorPhone, body);
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
    requestHttp.post(apiUrl, donateFormParams, function(err, response, body) {
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
        profile_email: member.profile_email,
        profile_first_name: member.profile_first_name,
        profile_postal_code: member.profile_postal_code,
        moco_campaign_id: MOCO_CAMPAIGN_ID,
        donorschoose_bot_id: DONORSCHOOSE_BOT_ID,
        donation_id: donation.donationId,
        donation_amount: DONATION_AMOUNT,
        proposal_id: project.id,
        proposal_remaining_amount: donation.remainingProposalAmount,
        proposal_url: project.url,
        school_name: project.schoolName,
        school_city: project.city,
        school_state: project.state
      };
      donationModel.create(donationLogData).then(function(doc) {
        logger.log('debug', 'dc.createDonationDoc success:%s', donation);
      }, promiseErrorCallback('dc.createDonationDoc user: ' + member.phone));
    };
  }
};

/**
 * Responds to member with confirmation of donation to the given project.
 * @param {object} member
 * @param {object} project
 */
DonorsChooseBotController.prototype.respondWithSuccess = function(member, project) {
  var self = this;
  logger.log('debug', 'dc.respondWithSuccess user:%s project%s', 
    member.phone, project);

  var donationCount = getDonationCount(member);
  var customFields = {};
  customFields[DONATION_COUNT_FIELDNAME] = donationCount + 1;

  var firstMessage = self.bot.msg_donation_success + ' ' + project.schoolName + ".";
  self.endChat(member, firstMessage);

  var delay = 2500;
  setTimeout(function() {
    var secondMessage = '@' + project.teacherName + ': Thx! ' + project.description;
    self.endChat(member, secondMessage);
  }, delay);

  setTimeout(function() {
    shortenLink(project.url, function(shortenedLink) {
      logger.log('debug', 'dc.sendSuccessMessages user:%s shortenedLink:%s', 
        member.phone, shortenedLink);
      var thirdMessage = self.bot.msg_project_link + ' ' + shortenedLink;
      self.endChat(member, thirdMessage, customFields);
    });
  }, 2 * delay);
}

/**
 * Posts MoCo profile_update to save msgTxt to member profile and send as SMS.
 * @param {object} member
 * @param {number} optInPath - Should contain {{slothbot_response}} as Liquid
 * @param {string} msgTxt - Value to save to our slothboth_response Custom Field
 * @param {object} [profileFields] - Key/values to save as MoCo Custom Fields
 */
function sendSMS(member, optInPath, msgTxt, profileFields) {
  if (typeof optInPath === 'undefined') {
    logger.error('dc.sendSMS undefined optInPath user:%s msgText:%s', member, msgTxt);
    return;
  }
  var mobileNumber = smsHelper.getNormalizedPhone(member.phone);
  var msgTxt = msgTxt.replace('{{postal_code}}', member.profile_postal_code);

  if (typeof profileFields === 'undefined') {
    profileFields = {gambit_chatbot_response: msgTxt};
  }
  else {
    profileFields.gambit_chatbot_response = msgTxt;
  }

  mobilecommons.profile_update(mobileNumber, optInPath, profileFields);
}

/**
 * Returns number of times member has donated to current Donation campaign.
 * @param {object} member 
 * @return {number}
 */
function getDonationCount(member) {
  var count = parseInt(member['profile_' + DONATION_COUNT_FIELDNAME]);
  if (!count) {
    return 0;
  }
  return count;
}

/**
 * Returns URL string to query for DonorsChoose projects.
 * @param {string} zip 
 * @return {string}
 */
function getDonorsChooseProposalsQueryURL(zip) {
  // @see https://data.donorschoose.org/docs/project-listing/json-requests/
  var url = donorsChooseProposalsHost + 'common/json_feed.html';
  url += '?subject4=-4'; 
  url += '&sortBy=2'; 
  url += '&costToCompleteRange=' + DONATION_AMOUNT + '+TO+10000'; 
  url += '&max=1';
  url += '&zip=' + zip;
  return url;
}

/**
 * Decodes proposal returned from DonorsChoose API.
 * @param {object} proposal
 * @return {object}
 */
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
 * Queries Gambit Jr. API to sync donorschoose_bots config documents.
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
DonorsChooseBotController.prototype.syncBotConfigs = function(req, res) {
  var self = this;

  var url = 'http://dev-gambit-jr.pantheonsite.io/wp-json/wp/v2/donorschoose_bots/';
  requestHttp.get(url, function(error, response, body) {
    if (error) {
      res.status(500);
      return;
    }
    var bots = JSON.parse(body);
    var propertyNames = [
      'msg_ask_email',
      'msg_ask_first_name',
      'msg_ask_zip',
      'msg_donation_success',
      'msg_error_generic',
      'msg_invalid_email',
      'msg_invalid_first_name',
      'msg_invalid_zip',
      'msg_project_link',
      'msg_max_donations_reached',
      'msg_search_start',
      'msg_search_no_results'
    ];
    var bot, configDoc, propertyName;
    for (var i = 0; i < bots.length; i++) {
      bot = bots[i];
      configDoc = app.getConfig(app.ConfigName.DONORSCHOOSE_BOTS, bot.id);
      if (!configDoc) {
        logger.log('info', 'dc.syncBotConfigs doc not found for id:%s', bot.id);
        continue;
      }
      for (var j = 0; j < propertyNames.length; j++) {
        propertyName = propertyNames[j];
        configDoc[propertyName] = bot[propertyName];
      }
      configDoc.name = bot.title;
      configDoc.refreshed_at = Date.now();
      configDoc.save();
      logger.log('info', 'dc.syncBotConfigs success for id:%s', bot.id);
    }
    res.send();
  });
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
    // @todo Can likely uncomment this and remove the many other calls we have
    // this.endChatWithFail(this.member);
  }
}

module.exports = DonorsChooseBotController;
