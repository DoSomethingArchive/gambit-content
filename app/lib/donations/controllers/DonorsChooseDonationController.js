"use strict";

/**
 * Donors Choose implementation of the donation interface.
 *
 * The flow a user should be guided through:
 *   1. start
 *      - sends the appropriate optin path to start the donation
 *      - unless a max number of donations have been made, then a message
 *        is sent to notify the user about that
 *      - calls findProject
 *      - findProject responsible for responding to user with project details
 *        and asking for the first name
 *   2. retrieveFirstName
 *   3. retrieveEmail
 *      - will call submitDonation
 *        submitDonation responsible for responding to user with success message
 */

var donorsChooseApiKey = (process.env.DONORSCHOOSE_API_KEY || null)
  , donorsChooseApiPassword = (process.env.DONORSCHOOSE_API_PASSWORD || null)
  , donorsChooseDonationBaseURL = 'https://apisecure.donorschoose.org/common/json_api.html?APIKey='
  , donorsChooseProposalsQueryBaseURL = 'http://api.donorschoose.org/common/json_feed.html?'
  , defaultDonorsChooseTransactionEmail = (process.env.DONORSCHOOSE_DEFAULT_EMAIL || null);

if (process.env.NODE_ENV == 'test') {
  donorsChooseApiKey = 'DONORSCHOOSE';
  donorsChooseApiPassword = 'helpClassrooms!';
  donorsChooseDonationBaseURL = 'https://dev1-apisecure.donorschoose.org/common/json_api.html?APIKey=';
}

var TYPE_OF_LOCATION_WE_ARE_QUERYING_FOR = 'zip' // 'zip' or 'state'. Our retrieveLocation() function will adjust accordingly.
  , DONATION_AMOUNT = 10
  , COST_TO_COMPLETE_UPPER_LIMIT = 10000
  , DONATE_API_URL = donorsChooseDonationBaseURL + donorsChooseApiKey
  , DONATION_LOCATION = 'MN' // for Minnesota;
  , END_MESSAGE_DELAY = 1000; 

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
  , userModel = rootRequire('app/lib/sms-games/models/sgUser')(connectionOperations)
  ;

// @TODO: add some kind of reference to retrieve the donations config 
// var donationConfigModel = require('../')

function DonorsChooseDonationController() {
  this.host; // Used to store reference to application host.
  this.resourceName; // Resource name identifier. Specifies controller to route. 
};

/**
 * Resource name identifier. Routes will use this to specify the controller to use.
 */
DonorsChooseDonationController.prototype.resourceName = 'donors-choose';

/**
 * Optional method to start the donation flow. Validates that this user is
 * allowed to make a donation.
 *
 * @param request
 *   Express Request object
 * @param response
 *   Express Response object
 */
DonorsChooseDonationController.prototype.start = function(request, response) {
  var phone;
  var configId;
  var self = this;

  // Find the user
  phone = smsHelper.getNormalizedPhone(request.body.phone);
  configId = request.query.id;
  userModel.findOne({phone: phone}, onUserFound);

  response.send();

  // Callback after user is found
  function onUserFound(err, doc) {
    var config;
    var donationsCount;
    var i;

    if (err) {
      logger.error(err);
    }

    donationsCount = 0;
    if (doc && doc.donations) {
      for (i = 0; i < doc.donations.length; i++) {
        if (configId == doc.donations[i].config_id) {
          donationsCount = doc.donations[i].count;
          break;
        }
      }
    }

    config = app.getConfig(app.ConfigName.DONORSCHOOSE, configId);

    // If user has not hit the max limit, start the donation flow.
    if (!config.max_donations_allowed || donationsCount < config.max_donations_allowed) {
      self.findProject(phone, configId);
    }
    // Otherwise, send an error message
    else {
      sendSMS(phone, config.max_donations_reached_oip);
    }
  }
};

/**
 * Finds a project. Also responsible for sending the
 * project details back to the user.
 *
 * @param request
 *   Express Request object
 * @param response
 *   Express Response object
 */
DonorsChooseDonationController.prototype.findProject = function(mobileNumber, configId) {

  var config = app.getConfig(app.ConfigName.DONORSCHOOSE, request.query.id);
  var locationFilter = 'state=' + DONATION_LOCATION;

  // Subject code for all 'Math & Science' subjects.
  var subjectFilter = 'subject4=-4'; 
  // Search returns results ordered by urgency algorithm. 
  var urgencySort = 'sortBy=0'; 
  // Constrains results which fall within a specific 'costToComplete' value range. 
  var costToCompleteRange = 'costToCompleteRange=' + DONATION_AMOUNT + '+TO+' + COST_TO_COMPLETE_UPPER_LIMIT; 
  // Maximum number of results to return. 
  var maxNumberOfResults = '1';
  var filterParams = locationFilter + '&' + subjectFilter + '&' + urgencySort + '&' + costToCompleteRange + '&';
  var requestUrlString = donorsChooseProposalsQueryBaseURL + filterParams + 'APIKey=' + donorsChooseApiKey + '&max=' + maxNumberOfResults;

  requestHttp.get(requestUrlString, function(error, response, data) {
    if (!error) {
      var donorsChooseResponse;
      try {
        donorsChooseResponse = JSON.parse(data);
        if (!donorsChooseResponse.proposals || donorsChooseResponse.proposals.length == 0) {
          throw new Error('No proposals returned from Donors Choose');
        }
        else {
          var selectedProposal = donorsChooseResponse.proposals[0];
        }    
      }
      catch (e) {
        sendSMS(mobileNumber, config.error_start_again);
        // JSON.parse will throw a SyntaxError exception if data is not valid JSON
        logger.error('Invalid JSON data received from DonorsChoose API for user mobile: ' 
          + mobileNumber + ' , or selected proposal does not contain necessary fields. Error: ' + e);
        return;
      }

      if (selectedProposal) {

        var entities = new Entities(); // Calling 'html-entities' module to decode escaped characters.

        var mobileCommonsCustomFields = {
          SS_fulfillment_trailer:   entities.decode(selectedProposal.fulfillmentTrailer), 
          SS_teacher_name :         entities.decode(selectedProposal.teacherName), 
          SS_school_name :          entities.decode(selectedProposal.schoolName),
          SS_proj_location:         entities.decode(selectedProposal.city)
        };

      } else {
        sendSMS(mobileNumber, config.error_direct_user_to_restart);
        logger.error('DonorsChoose API response for user mobile: ' + mobileNumber 
          + ' has not returned with a valid proposal. Response returned: ' 
          + donorsChooseResponse);
        return;
      }

      // Email and first_name can be overwritten later. Included in case of error, transaction can still be completed. 
      var currentDonationInfo = {
        mobile: mobileNumber,
        email: 'donorschoose@dosomething.org', 
        first_name: 'Anonymous',
        location: DONATION_LOCATION,
        project_id: selectedProposal.id,
        project_url: selectedProposal.proposalURL,
        donation_complete: false
      }

      // .profile_update call placed within the donationModel.create() callback to 
      // ensure that the ORIGINAL DOCUMENT IS CREATED before the user texts back 
      // their email address and attempts to find the document to be updated. 
      donationModel.create(currentDonationInfo).then(function(doc) {
        mobilecommons.profile_update(mobileNumber, config.start_donation_flow, mobileCommonsCustomFields); // Arguments: phone, optInPathId, customFields.
        logger.info('Doc retrieved:', doc._id.toString(), ' - Updating Mobile Commons profile with:', mobileCommonsCustomFields);
      }, promiseErrorCallback('Unable to create donation document for user mobile: ' + mobileNumber));
    }
    else {
      sendSMS(mobileNumber, config.error_direct_user_to_restart);
      logger.error('Error for user mobile: ' + mobileNumber 
        + ' in retrieving proposal info from DonorsChoose or in uploading to MobileCommons custom fields: ' + error);
      return;
    }
  });
}

/**
 * Retrieves the user's first name to submit with the donation transaction.
 *
 * @param request
 *   Express Request object
 * @param response
 *   Express Response object
 */
DonorsChooseDonationController.prototype.retrieveFirstName = function(request, response) {
  var config = app.getConfig(app.ConfigName.DONORSCHOOSE, request.query.id);
  var userSubmittedName = smsHelper.getFirstWord(request.body.args);
  var mobile = smsHelper.getNormalizedPhone(request.body.phone);

  if (stringValidator.containsNaughtyWords(userSubmittedName) || !userSubmittedName) {
    userSubmittedName = 'Anonymous';
  }

  donationModel.findOneAndUpdate(
    {
      $and : [
        { mobile: mobile },
        { donation_complete: false }
      ]
    },
    {$set: {
      first_name: userSubmittedName
    }},
    function(err, num, raw) {
      if (err) {
        logger.error('Error in retrieving first name of user for user mobile: ' 
          + req.body.phone + ' | Error: ' + err);
        sendSMS(mobile, config.error_start_again);
      }
      else {
        // Updates user profile with first name and sends the next message. 
        mobilecommons.profile_update(mobile, config.ask_email
          , { SS_user_first_name: userSubmittedName })
      }
    }
  )
  response.send();
};

/**
 * Retrieves an email from the user to submit with the donation transaction. For
 * a Donors Choose donation, this is optional.
 *
 * @param request
 *   Express Request object
 * @param response
 *   Express Response object
 */
DonorsChooseDonationController.prototype.retrieveEmail = function(request, response) {

  var userSubmittedEmail = smsHelper.getFirstWord(request.body.args);
  var updateObject = { $set: { donation_complete: true }};
  var apiInfoObject = {
    'apiUrl':       DONATE_API_URL,
    'apiPassword':  donorsChooseApiPassword,
    'apiKey':       donorsChooseApiKey
  };
  var self = this;
  var req = request; 
  var config = app.getConfig(app.ConfigName.DONORSCHOOSE, request.query.id);
  var mobile = smsHelper.getNormalizedPhone(request.body.phone);

  // Populates the updateObject with the user's email only 
  // if it's non-obscene and is actually an email. Otherwise,
  // the submitDonation() function inserts a default DoSomething.org 
  // email address.
  if (stringValidator.isValidEmail(userSubmittedEmail) && !stringValidator.containsNaughtyWords(userSubmittedEmail)) {
    updateObject['$set'].email = userSubmittedEmail;
  }
  
  donationModel.findOneAndUpdate(
    {
      $and : [
        { mobile: mobile },
        { donation_complete: false }
      ]
    },
    updateObject,
    function(err, donorDocument) {
      if (err) {
        logger.error('Error for user mobile: ' + req.body.phone 
          + 'in donationModel.findOneAndUpdate: ' + err);
        sendSMS(mobile, config.error_start_again);
      } 
      else if (donorDocument) {
        logger.log('debug', 'Mongo donorDocument returned by retrieveEmail:' + donorDocument);
        // In the case that the user is out of order in the donation flow, 
        // or our app hasn't found a proposal (aka project) and attached a 
        // project_id to the document, we opt the user back into the start donation flow.  
        if (!donorDocument.project_id) {
          sendSMS(mobile, config.error_start_again);
        }
        else {
          
          var donorInfoObject = {
            donorEmail: donorDocument.email, 
            donorFirstName: (donorDocument.first_name || 'Anonymous'),
            donorPhoneNumber: mobile
          }

          self.submitDonation(apiInfoObject, donorInfoObject, donorDocument.project_id, config);
        }
      }
    }
  )
  response.send();
};

/**
 * Submits a donation transaction to Donors Choose.
 *
 * @param apiInfoObject = {apiUrl: string, apiPassword: string, apiKey: string}
 * @param donorInfoObject = {donorEmail: string, donorFirstName: string}
 * @param proposalId, the DonorsChoose proposal ID 
 *
 */
DonorsChooseDonationController.prototype.submitDonation = function(apiInfoObject, donorInfoObject, proposalId, donationConfig) {
  var donorPhone = donorInfoObject.donorPhoneNumber;

  // donorPhone = smsHelper.getNormalizedPhone(donorInfoObject.donorPhoneNumber);

  requestToken().then(requestDonation,
    promiseErrorCallback('Unable to successfully retrieve donation token from DonorsChoose.org API. User mobile: '
      + donorPhone)
  );

  /**
   * First request: obtains a unique token for the donation.
   */
  function requestToken() {
    // Creates promise-storing object.
    var deferred = Q.defer();
    var retrieveTokenParams = { 'form': {
      'APIKey': apiInfoObject.apiKey,
      'apipassword': apiInfoObject.apiPassword, 
      'action': 'token'
    }}
    requestHttp.post(apiInfoObject.apiUrl, retrieveTokenParams, function(err, response, body) {
      if (!err) {
        try {
          var jsonBody = JSON.parse(body);
          if (jsonBody.statusDescription == 'success') {
            logger.log('debug', 'Request for token returned body:' + jsonBody);
            deferred.resolve(JSON.parse(body).token);
          } else {
            logger.error('Unable to retrieve a donation token from the DonorsChoose API for user mobile:' 
              + donorPhone);
            sendSMS(donorPhone, donationConfig.error_start_again);
          }
        }
        catch (e) {
          logger.error('Failed trying to parse the donation token request response from DonorsChoose.org for user mobile:' 
            + donorPhone + ' Error: ' + e.message + '| Response: ' + response + '| Body: ' + body);
          sendSMS(donorPhone, donationConfig.error_start_again);
        }
      }
      else {
        deferred.reject('Was unable to retrieve a response from the submit donation endpoint of DonorsChoose.org, user mobile: ' 
          + donorPhone + 'error: ' + err);
        sendSMS(donorPhone, donationConfig.error_start_again);
      }
    });
    return deferred.promise;
  }

  /**
   * After promise we make the second request: donation transaction.
   */
  function requestDonation(tokenData) {
    var donateParams = {'form': {
      'APIKey': apiInfoObject.apiKey,
      'apipassword': apiInfoObject.apiPassword, 
      'action': 'donate',
      'token': tokenData,
      'proposalId': proposalId,
      'amount': DONATION_AMOUNT,
      'email': (donorInfoObject.donorEmail || defaultDonorsChooseTransactionEmail),
      'first': donorInfoObject.donorFirstName, 
      'last': 'a DoSomething.org member',
      'salutation': donorInfoObject.donorFirstName + ', a DoSomething.org Member'
    }};

    logger.info('Submitting donation with params:', donateParams);
    requestHttp.post(apiInfoObject.apiUrl, donateParams, function(err, response, body) {
      logger.log('debug', 'Donation submission return:', body.trim())
      if (err) {
        logger.error('Was unable to retrieve a response from the submit donation endpoint of DonorsChoose.org, user mobile: ' + donorInfoObject.donorPhoneNumber + 'error: ' + err);
        sendSMS(donorPhone, donationConfig.error_start_again);
      }
      else if (response && response.statusCode != 200) {
        logger.error('Failed to submit donation to DonorsChoose.org for user mobile: ' 
          + donorPhone + '. Status code: ' + response.statusCode + ' | Response: ' + response);
        sendSMS(donorPhone, donationConfig.error_start_again);
      }
      else {
        try {
          var jsonBody = JSON.parse(body);
          if (jsonBody.statusDescription == 'success') {
            logger.info('Donation to proposal ' + proposalId + ' was successful! Body:', jsonBody);
            updateUserWithDonation();
            sendSuccessMessages(donorPhone, donationConfig, jsonBody.proposalURL);
          }
          else {
            logger.warn('Donation to proposal ' + proposalId + ' for user mobile: ' 
              + donorPhone + ' was NOT successful. Body:' + JSON.stringify(jsonBody));
            sendSMS(donorPhone, donationConfig.error_start_again);
          }
        }
        catch (e) {
          logger.error('Failed trying to parse the donation response from DonorsChoose.org. User mobile: ' 
            + donorPhone + 'Error: ' + e.message);
          sendSMS(donorPhone, donationConfig.error_start_again);
        }
      }
    })
  }

  /**
   * Start donation process.
   */
  function updateUserWithDonation() {
    userModel.findOne({phone: donorPhone}, function(err, doc) {
      if (err) {
        logger.error(err);
      }

      if (!doc) {
        userModel.create({phone: donorPhone})
          .then(incrementDonationCount);
      }
      else {
        incrementDonationCount(doc);
      }
    });
  }

  /**
   * Updates the donation count in a user's donation history.
   *
   * @param doc
   *   Document for user that made a donation
   */
  function incrementDonationCount(doc) {
    var i;
    var countUpdated = false;

    if (!doc) {
      return;
    }

    // Find previous donation history and increment the count if found
    for (i = 0; i < doc.donations.length; i++) {
      if (doc.donations[i].config_id == donationConfig._id) {
        doc.donations[i].count += 1;
        countUpdated = true;
        break;
      }
    }

    // If no previous donation found, add a new item
    if (!countUpdated) {
      doc.donations[doc.donations.length] = {
        config_id: donationConfig._id,
        count: 1
      }
    }

    // Update the user document
    userModel.update(
      {phone: doc.phone},
      {$set: {donations: doc.donations}}
    ).exec();
  }

  /**
   * Sends message to user after a successful donation.
   *
   * @param url
   *   URL to the DonorsChoose project
   */
  function sendSuccessMessages(mobileNumber, donationConfig, projectUrl) {
    var mobileNumber = mobileNumber;
    var donationConfig = donationConfig;
    var projectUrl = projectUrl;

    // First message user receives. 
    mobilecommons.profile_update(mobileNumber, donationConfig.donation_complete_project_info_A);

    // Second message user receives. 
    setTimeout(function() {
      mobilecommons.profile_update(mobileNumber, donationConfig.donation_complete_project_info_B);
    }, END_MESSAGE_DELAY)

    // Last message user receives. Uses Bitly to shorten the link, then updates the user's MC profile.
    setTimeout(function() {
      shortenLink(url, function(shortenedLink) {
        var customFields = {
          donorsChooseProposalUrl: shortenedLink
        };
        mobilecommons.profile_update(donorPhone, donationConfig.donation_complete_give_url, customFields);
      });
    }, END_MESSAGE_DELAY + END_MESSAGE_DELAY)
  }
};

/**
 * Retrieves the location of a user to use for finding a project. For Donors Choose
 * this will be the user's state.
 *
 * @param request
 *   Express Request object
 * @param response
 *   Express Response object
 */
DonorsChooseDonationController.prototype.retrieveLocation = function(request, response) {

  if (typeof request.query.id === 'undefined'
      || typeof request.body.phone === 'undefined'
      || typeof request.body.args === 'undefined') {
    response.status(406).send('Missing required params.');
    return;
  }

  response.send();

  var config = app.getConfig(app.ConfigName.DONORSCHOOSE, request.query.id);
  var location = smsHelper.getFirstWord(request.body.args);

  if (TYPE_OF_LOCATION_WE_ARE_QUERYING_FOR == 'zip') {
    if (!stringValidator.isValidZip(location)) {
      sendSMS(request.body.phone, config.invalid_zip_oip);
      logger.info('User ' + request.body.phone 
        + ' did not submit a valid zipcode in the DonorsChoose.org flow.');
      return;
    }
  }
  else if (TYPE_OF_LOCATION_WE_ARE_QUERYING_FOR == 'state') {
    if (!stringValidator.isValidState(location)) {
      sendSMS(request.body.phone, config.invalid_state_oip);
      logger.info('User ' + request.body.phone 
        + ' did not submit a valid state abbreviation in the DonorsChoose.org flow.');
      return;
    }
  }

  var info = {
    mobile: request.body.phone,
    location: location
  };

  this._post('find-project?id=' + request.query.id, info);
};

/**
 * Sets the hostname.
 *
 * @param host
 *   The hostname string.
 */
DonorsChooseDonationController.prototype.setHost = function(host) {
  this.host = host;
};

/**
 * POST data to another endpoint on this Donors Choose resource.
 *
 * @param endpoint
 *   Endpoint to POST to.
 * @param data
 *   Object with data to POST to the endpoint.
 */
DonorsChooseDonationController.prototype._post = function(endpoint, data) {
  var url = 'http://' + this.host + '/donations/' + this.resourceName + '/' + endpoint;

  var payload = {form:{}};
  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    payload.form[keys[i]] = data[keys[i]];
  }

  requestHttp.post(url, payload, function(err, response, body) {
    if (err) {
      logger.error(err);
    }

    if (response && response.statusCode) {
      logger.info('DonorsChooseDonationController - POST to ' + url 
        + ' return status code: ' + response.statusCode);
    }
  });
}

/**
 * Sets the hostname.
 *
 * @param host
 *   The hostname string.
 */
DonorsChooseDonationController.prototype.setHost = function(host) {
  this.host = host;
};

/**
 * The following two functions are for handling Mongoose Promise chain errors.
 */
function promiseErrorCallback(message, userPhone) {
  return onPromiseErrorCallback.bind({message: message, userPhone: userPhone});
}

function onPromiseErrorCallback(err) {
  if (err) {
    logger.error(this.message + '\n', err.stack);
    sendSMS(this.userPhone, config.error_start_again)
  }
}

/**
 * Subscribe phone number to a Mobile Commons opt-in path.
 *
 * @param phone
 *  Phone number to subscribe.
 * @param oip
 *   Opt-in path to subscribe to.
 */
function sendSMS(phone, oip) {
  mobilecommons.profile_update(phone, oip);
};

module.exports = DonorsChooseDonationController;