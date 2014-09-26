"use strict";

/**
 * Donors Choose implementation of the donation interface.
 *
 * The flow a user should be guided through:
 *   1. retrieveLocation
 *      - will call findProject
 *      - findProject responsible for responding to user with project details
 *        and asking for the first name
 *   2. retrieveFirstName
 *   3. retrieveEmail
 *      - will call submitDonation
 *        submitDonation responsible for responding to user with success message
 */

var mobilecommons = require('../../../../mobilecommons/mobilecommons')
  , messageHelper = require('../../userMessageHelpers')
  , requestHttp = require('request')
  , dc_config = require('../config/donorschoose')
  , Q = require('q');

var donorsChooseApiKey = (process.env.DONORSCHOOSE_API_KEY || null),
    donorsChooseApiPassword = (process.env.DONORSCHOOSE_API_PASSWORD || null),
    testDonorsChooseApiKey = 'DONORSCHOOSE',
    testDonorsChooseApiPassword = 'helpClassrooms!';

function DonorsChooseDonationController(app) {
  this.app = app;
  this.donationModel = require('../models/DonationInfo')(app);
};

/**
 * Resource name identifier. Routes will use this to specify the controller to use.
 */
DonorsChooseDonationController.prototype.resourceName = 'donors-choose';

/**
 * Finds a project based on user input. Also responsible for sending the
 * project details back to the user.
 *
 * @param request
 *   Express Request object
 * @param response
 *   Express Response object
 */
DonorsChooseDonationController.prototype.findProject = function(request, response) {
  if (typeof request.query.id === 'undefined'
      || typeof request.body.mobile === 'undefined'
      || typeof request.body.location === 'undefined') {
    response.send(406, 'Missing required params.');
    return false;
  }

  // Checking to see if the location param is a zip code or a state,
  // and assigning query params accordingly. 
  if (parseInt(request.body.location)){
    var locationFilter = 'keywords=' + request.body.location; // If zip. 
  } 
  else {
    var locationFilter =  'state=' + request.body.location; // If state. 
  }

  // @todo Compose and send SMS message back to user with project details

  var subjectFilter = 'subject4=-4'; // Subject code for all 'Math & Science' subjects.
  var urgencySort = 'sortBy=0'; // Search returns results ordered by urgency algorithm. 

  var filterParams = locationFilter + '&' + subjectFilter + '&' + urgencySort + '&';
  var requestUrlString = 'http://api.donorschoose.org/common/json_feed.html?' + filterParams + 'APIKey=' + donorsChooseApiKey;
  var testRequestUrlString = 'http://api.donorschoose.org/common/json_feed.html?' + filterParams + 'APIKey=DONORSCHOOSE';

  requestHttp.get(requestUrlString, function(error, response, data) {
    if (!error) {
      var donorsChooseResponse = JSON.parse(data);
      var proposals = donorsChooseResponse.proposals;

      // Making sure that the project funded has a costToComplete >= $10.
      // If none of the projects returned satisfy this condition;
      // we'll select the project with the greatest cost to complete. 
      for (var i = 0; i < proposals.length; i++) {
        if (parseInt(proposals[i].costToComplete) >= 10) {
          var selectedProposal = proposal[i];
          break;
        }
        else if ((!selectedProposal)|| (proposals[i].costToComplete > selectedProposal.costToComplete)) {
          var selectedProposal = proposal[i];
        }
      }

      var mobileCommonsCustomFields = {
        donorsChooseProposalId : selectedProposal.id,
        donorsChooseProposalTitle : selectedProposal.title,
        donorsChooseProposalUrl : selectedProposal.proposalUrl,
        donorsChooseProposalTeacherName : selectedProposal.teacherName,
        donorsChooseProposalSchoolName : selectedProposal.schoolName,
        donorsChooseProposalSchoolCity : selectedProposal.city,
        donorsChooseProposalSummary : selectedProposal.fulfillmentTrailer,
      }

      mobilecommons.profile_update(request.body.mobile, OPTINPATHID, mobileCommonsCustomFields) //phone, optInPathId, customFields. 

      // What's the best, non-hard-coded way of referencing the OptInPathId from inside this function? 

      response.send(responseText);
    }
    else {
      response.send(404, 'Was unable to retrieve a response from DonorsChoose.org.');
      return false;
    }
  });
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

  // Calls the submitDonation() function. 

  response.send();
};

/**
 * Retrieves the users first name to submit with the donation transaction.
 *
 * @param request
 *   Express Request object
 * @param response
 *   Express Response object
 */
DonorsChooseDonationController.prototype.retrieveFirstName = function(request, response) {
  response.send();
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
    response.send(406, 'Missing required params.');
    return false;
  }

  //Check to see if there's going to be 

  // Needs to be edited to respond to ZipCodes. 
  var config = dc_config[request.query.id];
  var state = messageHelper.getFirstWord(request.body.args);
  if (!isValidState(state)) {
    sendSMS(request.body.phone, config.invalid_state_oip);
    return false;
  }

  var info = {
    mobile: request.body.phone,
    location: state
  };

  // Create doc to store data through the donation flow
  this.donationModel.create(info).then(function(doc) {
    console.log(doc);
  });

  // POST same data to find-project endpoint
  this._post('find-project?id=' + request.query.id, info);
  response.send();
};

/**
 * Submits a donation transaction to Donors Choose.
 *
<<<<<<< HEAD
 * @param proposalId
=======
 * @param request
>>>>>>> master
 *   Express Request object
 * @param response
 *   Express Response object
 */

DonorsChooseDonationController.prototype.submitDonation = function(apiKey, apiPassword, apiUrl, proposalId, donationAmount, donorEmail, donorFirstName, donorLastName) {

  var productionDonateUrlString = 'https://apisecure.donorschoose.org/common/json_api.html?';
  var testDonateUrlString = 'https://apiqasecure.donorschoose.org/common/json_api.html?';

  // requestToken().then(requestTransaction(token), function(reason){});

  // First request: obtains a unique token for the donation. 
  var requestToken = function(){
    // Creates promise-storing object.
    var deferred = Q.defer();
    var retrieveTokenParams = {
      'APIKey': apiKey,
      'apipassword': apiPassword, 
      'action': 'token'
    }
    requestHttp.post(apiUrl, retrieveTokenParams, function(err, response, body) {
      if (!err) {
        deferred.resolve(body.token);
      }
      else {
        deferred.reject('Was unable to retrieve a response from the submit donation endpoint of DonorsChoose.org, error: ', err);
      }
    });
    return deferred.promise;
  }

  // Second request: donation transaction. 
  var requestTransaction = function(token){
    var donateParams = {
      'APIKey': apikey,
      'apipassword': apiPassword, 
      'action': 'donate',
      'token': token
    }
    requestHttp.post(apiUrl, donateParams, function(err, response, body) {
      if (!err) {
        console.log('Donation to proposal ' + proposalId + ' was successful! Response: ', response, 'Body: ', body);
      }
      else {
        console.log('Was unable to retrieve a response from the submit donation endpoint of DonorsChoose.org, error: ', err);
        return false;
      }
    })
  }

  requestToken().then(requestTransaction(token)); 
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
      console.log(err);
    }

    if (response && response.statusCode) {
      console.log('POST to ' + url + ' return status code: ' + response.statusCode);
    }
  });
}

/**
 * Check if string is an abbreviated US state.
 *
 * @param state
 * @return Boolean
 */
function isValidState(state) {
  var states = 'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|GU|PR|VI';
  var split = states.split('|');
  if (split.indexOf(state.toUpperCase()) > -1) {
    return true;
  }
  else {
    return false;
  }
}

function isValidZipCode(zip) {
  return /(^\d{5}$)|(^\d{5}-\d{4}$)/.test(zip);
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
  var args = {
    alphaPhone: phone,
    alphaOptin: oip
  };
  mobilecommons.optin(args);
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
      console.log(err);
    }

    if (response && response.statusCode) {
      console.log('POST to ' + url + ' return status code: ' + response.statusCode);
    }
  });
}

/**
 * Check if string is an abbreviated US state.
 *
 * @param state
 * @return Boolean
 */
function isValidState(state) {
  var states = 'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|GU|PR|VI';
  var split = states.split('|');
  if (split.indexOf(state.toUpperCase()) > -1) {
    return true;
  }
  else {
    return false;
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
  var args = {
    alphaPhone: phone,
    alphaOptin: oip
  };

  mobilecommons.optin(args);
};

module.exports = DonorsChooseDonationController;
