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

var donorsChooseApiKey = (process.env.DONORSCHOOSE_API_KEY || null)
  , donorsChooseApiPassword = (process.env.DONORSCHOOSE_API_PASSWORD || null)
  , donorsChooseDonationBaseURL = 'https://apisecure.donorschoose.org/common/json_api.html?APIKey='
  , donorsChooseProposalsQueryBaseURL = 'http://api.donorschoose.org/common/json_feed.html?'
  , defaultDonorsChooseTransactionEmail = (process.env.DONORSCHOOSE_DEFAULT_EMAIL || null);

if (process.env.NODE_ENV == 'test') {
  donorsChooseApiKey = 'DONORSCHOOSE';
  donorsChooseApiPassword = 'helpClassrooms!';
  donorsChooseDonationBaseURL = 'https://apiqasecure.donorschoose.org/common/json_api.html?APIKey=';
}

var TYPE_OF_LOCATION_WE_ARE_QUERYING_FOR = 'zip' // 'zip' or 'state'. Our retrieveLocation() function will adjust accordingly.
  , DONATION_AMOUNT = 10
  , COST_TO_COMPLETE_UPPER_LIMIT = 10000
  , DONATE_API_URL = donorsChooseDonationBaseURL + donorsChooseApiKey
  , CITY_SCHOOLNAME_CHARLIMIT = 79; // Limit for the number of characters we have in this OIP: https://secure.mcommons.com/campaigns/128427/opt_in_paths/170623

var mobilecommons = require('../../../../mobilecommons')
  , smsHelper = require('../../smsHelpers')
  , requestHttp = require('request')
  , dc_config = require('../config/donorschoose')
  , Q = require('q')
  , shortenLink = require('../../bitly')
  , logger = require('../../logger')
  , Entities = require('html-entities').AllHtmlEntities
  ;

var donationModel = require('../models/DonationInfo');

function DonorsChooseDonationController() {
  this.host; // Used to store reference to application host.
  this.resourceName; // Resource name identifier. Specifies controller to route. 
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
    response.status(406).send('Missing required params.');
    return;
  }

  var config = dc_config[request.query.id];

  // Checking to see if the location param is a zip code or a state,
  // and assigning query params accordingly. 
  if (parseInt(request.body.location)) {
    var locationFilter = 'keywords=' + request.body.location; // If zip. 
  }
  else {
    var locationFilter =  'state=' + request.body.location; // If state. 
  }

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

  var req = request;

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
        sendSMS(req.body.mobile, config.error_direct_user_to_restart);
        // JSON.parse will throw a SyntaxError exception if data is not valid JSON
        logger.error('Invalid JSON data received from DonorsChoose API for user mobile: ' 
          + req.body.mobile + ' , or selected proposal does not contain necessary fields. Error: ' + e);
        return;
      }

      if (selectedProposal) {
        var revisedLocation = selectedProposal.city;
        var revisedSchoolName = selectedProposal.schoolName;

        // Check to see if we exceed the character limits of this text message: 
        // https://secure.mcommons.com/campaigns/128427/opt_in_paths/170623
        if ((selectedProposal.city + selectedProposal.schoolName).length > CITY_SCHOOLNAME_CHARLIMIT) {
          revisedLocation = selectedProposal.state; // subsitute the state abbreviation
          if ((revisedLocation + selectedProposal.schoolName).length > CITY_SCHOOLNAME_CHARLIMIT) {
            revisedSchoolName = selectedProposal.schoolName.slice(0, parseInt(CITY_SCHOOLNAME_CHARLIMIT)-2);
          }
        }

        var entities = new Entities(); // Calling 'html-entities' module to decode escaped characters.

        var mobileCommonsCustomFields = {
          donorsChooseProposalId :          entities.decode(selectedProposal.id),
          donorsChooseProposalTitle :       entities.decode(selectedProposal.title),
          donorsChooseProposalTeacherName : entities.decode(selectedProposal.teacherName), // Currently used in MobileCommons.
          donorsChooseProposalSchoolName :  entities.decode(revisedSchoolName), // Currently used in MobileCommons. 
          donorsChooseProposalSchoolCity :  entities.decode(revisedLocation), // Currently used in MobileCommons.
          donorsChooseProposalSummary :     entities.decode(selectedProposal.fulfillmentTrailer),
        };       
      } else {
        sendSMS(req.body.mobile, config.error_direct_user_to_restart);
        logger.error('DonorsChoose API response for user mobile: ' + req.body.mobile 
          + ' has not returned with a valid proposal. Response returned: ' 
          + donorsChooseResponse);
        return;
      }

      // Email and first_name can be overwritten later. Included in case of error, transaction can still be completed. 
      var currentDonationInfo = {
        mobile: req.body.mobile,
        email: 'donorschoose@dosomething.org', 
        first_name: 'Anonymous',
        location: req.body.location,
        project_id: selectedProposal.id,
        project_url: selectedProposal.proposalURL,
        donation_complete: false
      }

      // .profile_update call placed within the donationModel.create() callback to 
      // ensure that the ORIGINAL DOCUMENT IS CREATED before the user texts back 
      // their name and attempts to find the  document to be updated. 
      donationModel.create(currentDonationInfo).then(function(doc) {
        mobilecommons.profile_update(request.body.mobile, config.found_project_ask_name, mobileCommonsCustomFields); // Arguments: phone, optInPathId, customFields.
        logger.info('Doc retrieved:', doc._id.toString(), ' - Updating Mobile Commons profile with:', mobileCommonsCustomFields);
      }, promiseErrorCallback('Unable to create donation document for user mobile: ' + req.body.mobile));
    }
    else {
      sendSMS(req.body.mobile, config.error_direct_user_to_restart);
      logger.error('Error for user mobile: ' + req.body.mobile 
        + ' in retrieving proposal info from DonorsChoose or in uploading to MobileCommons custom fields: ' + error);
      return;
    }
  });
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
  var config = dc_config[request.query.id];

  // Populates the updateObject with the user's email only 
  // if it's non-obscene and is actually an email. Otherwise,
  // the submitDonation() function inserts a default DoSomething.org 
  // email address.
  if (isValidEmail(userSubmittedEmail) && !containsNaughtyWords(userSubmittedEmail)) {
    updateObject['$set'].email = userSubmittedEmail;
  }
  
  donationModel.findOneAndUpdate(
    {
      $and : [
        { mobile: request.body.phone },
        { donation_complete: false }
      ]
    },
    updateObject,
    function(err, donorDocument) {
      if (err) {
        logger.error('Error for user mobile: ' + req.body.phone 
          + 'in donationModel.findOneAndUpdate: ' + err);
        sendSMS(req.body.phone, config.error_direct_user_to_restart);
      } 
      else if (donorDocument) {
        logger.log('debug', 'Mongo donorDocument returned by retrieveEmail:' + donorDocument);
        // In the case that the user is out of order in the donation flow, 
        // or our app hasn't found a proposal (aka project) and attached a 
        // project_id to the document, we opt the user back into the start donation flow.  
        if (!donorDocument.project_id) {
          sendSMS(req.body.phone, config.error_direct_user_to_restart);
        }
        else {
          
          var donorInfoObject = {
            donorEmail: donorDocument.email, 
            donorFirstName: (donorDocument.first_name || 'Anonymous'),
            donorPhoneNumber: req.body.phone
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
  // First request: obtains a unique token for the donation.
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
              + donorInfoObject.donorPhoneNumber);
            sendSMS(donorInfoObject.donorPhoneNumber, donationConfig.error_direct_user_to_restart);
          }
        }
        catch (e) {
          logger.error('Failed trying to parse the donation token request response from DonorsChoose.org for user mobile:' 
            + donorInfoObject.donorPhoneNumber + ' Error: ' + e.message + '| Response: ' + response + '| Body: ' + body);
          sendSMS(donorInfoObject.donorPhoneNumber, donationConfig.error_direct_user_to_restart);
        }
      }
      else {
        deferred.reject('Was unable to retrieve a response from the submit donation endpoint of DonorsChoose.org, user mobile: ' 
          + donorInfoObject.donorPhoneNumber + 'error: ' + err);
        sendSMS(donorInfoObject.donorPhoneNumber, donationConfig.error_direct_user_to_restart);
      }
    });
    return deferred.promise;
  }

  // After promise we make the second request: donation transaction.
  requestToken().then(function(tokenData) {
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
        sendSMS(donorInfoObject.donorPhoneNumber, donationConfig.error_direct_user_to_restart);
      }
      else if (response && response.statusCode != 200) {
        logger.error('Failed to submit donation to DonorsChoose.org for user mobile: ' 
          + donorInfoObject.donorPhoneNumber + '. Status code: ' + response.statusCode + ' | Response: ' + response);
        sendSMS(donorInfoObject.donorPhoneNumber, donationConfig.error_direct_user_to_restart);
      }
      else {
        try {
          var jsonBody = JSON.parse(body);
          if (jsonBody.statusDescription == 'success') {
            logger.info('Donation to proposal ' + proposalId + ' was successful! Body:', jsonBody);
            // Uses Bitly to shorten the link, then updates the user's MC profile.
            shortenLink(jsonBody.proposalURL, function(shortenedLink) {
              var customFields = {
                donorsChooseProposalUrl: shortenedLink
              };
              mobilecommons.profile_update(donorInfoObject.donorPhoneNumber, donationConfig.donate_complete, customFields);
            })
          } else {
            logger.warn('Donation to proposal ' + proposalId + ' for user mobile: ' 
              + donorInfoObject.donorPhoneNumber + ' was NOT successful. Body:' + JSON.stringify(jsonBody));
            sendSMS(donorInfoObject.donorPhoneNumber, donationConfig.error_direct_user_to_restart);
          }
        }
        catch (e) {
          logger.error('Failed trying to parse the donation response from DonorsChoose.org. User mobile: ' 
            + donorInfoObject.donorPhoneNumber + 'Error: ' + e.message);
          sendSMS(donorInfoObject.donorPhoneNumber, donationConfig.error_direct_user_to_restart);
        }
      }
    })
  },
  promiseErrorCallback('Unable to successfully retrieve donation token from DonorsChoose.org API. User mobile: ' 
    + donorInfoObject.donorPhoneNumber)); 
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

  var config = dc_config[request.query.id];
  var userSubmittedName = smsHelper.getFirstWord(request.body.args);
  var req = request;

  if (containsNaughtyWords(userSubmittedName) || !userSubmittedName) {
    userSubmittedName = 'Anonymous';
  }

  donationModel.findOneAndUpdate(
    {
      $and : [
        { mobile: request.body.phone },
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
        sendSMS(request.body.phone, config.error_direct_user_to_restart);
      }
      else {
        sendSMS(request.body.phone, config.received_name_ask_email);
      }
    }
  )

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
    response.status(406).send('Missing required params.');
    return;
  }

  response.send();

  var config = dc_config[request.query.id];
  var location = smsHelper.getFirstWord(request.body.args);

  if (TYPE_OF_LOCATION_WE_ARE_QUERYING_FOR == 'zip') {
    if (!isValidZip(location)) {
      sendSMS(request.body.phone, config.invalid_zip_oip);
      logger.info('User ' + request.body.phone 
        + ' did not submit a valid zipcode in the DonorsChoose.org flow.');
      return;
    }
  }
  else if (TYPE_OF_LOCATION_WE_ARE_QUERYING_FOR == 'state') {
    if (!isValidState(location)) {
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
    sendSMS(this.userPhone, config.error_direct_user_to_restart)
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
 * Check if string is a valid zip code.
 *
 * @param zip
 * @return Boolean
 */
function isValidZip(zip) {
  return /(^\d{5}$)|(^\d{5}-\d{4}$)/.test(zip);
}

/**
 * Check if string is a valid email address.
 *
 * @param email
 * @return Boolean
 */
function isValidEmail(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

/**
 * Checks to see if user inputted strings contains naughty words. 
 *
 * @param phone
 *  Phone number to subscribe.
 * @param oip
 *   Opt-in path to subscribe to.
 */

function containsNaughtyWords(stringToBeCensored) {
  var naughtyWords = [ '2g1c', '2girls 1 cup', 'acrotomophilia', 'anal', 'anilingus', 'anus', 'arsehole', 'ass', 'asshole', 'assmunch', 'autoerotic', 'autoerotic', 'babeland', 'babybatter', 'ballgag', 'ballgravy', 'ballkicking', 'balllicking', 'ballsack', 'ballsucking', 'bangbros', 'bareback', 'barelylegal', 'barenaked', 'bastardo', 'bastinado', 'bbw', 'bdsm', 'beavercleaver', 'beaverlips', 'bestiality', 'bicurious', 'bigblack', 'bigbreasts', 'bigknockers', 'bigtits', 'bimbos', 'birdlock', 'bitch', 'blackcock', 'blondeaction', 'blondeon blonde action', 'blowj', 'blowyourl', 'bluewaffle', 'blumpkin', 'bollocks', 'bondage', 'boner', 'boob', 'boobs', 'bootycall', 'brownshowers', 'brunetteaction', 'bukkake', 'bulldyke', 'bulletvibe', 'bunghole', 'bunghole', 'busty', 'butt', 'buttcheeks', 'butthole', 'cameltoe', 'camgirl', 'camslut', 'camwhore', 'carpetmuncher', 'carpetmuncher', 'chink', 'chocolaterosebuds', 'circlejerk', 'clevelandsteamer', 'clit', 'clitoris', 'cloverclamps', 'clusterfuck', 'cock', 'cocks', 'coprolagnia', 'coprophilia', 'cornhole', 'cum', 'cumming', 'cunnilingus', 'cunt', 'darkie', 'daterape', 'daterape', 'deepthroat', 'deepthroat', 'dick', 'dildo', 'dirtypillows', 'dirtysanchez', 'doggiestyle', 'doggiestyle', 'doggystyle', 'doggystyle', 'dogstyle', 'dolcett', 'domination', 'dominatrix', 'dommes', 'donkeypunch', 'doubledong', 'doublepenetration', 'dpaction', 'eatmyass', 'ecchi', 'ejaculation', 'erotic', 'erotism', 'escort', 'ethicalslut', 'eunuch', 'faggot', 'fecal', 'felch', 'fellatio', 'feltch', 'femalesquirting', 'femdom', 'figging', 'fingering', 'fisting', 'footfetish', 'footjob', 'frotting', 'fuck', 'fuckbuttons', 'fudgepacker', 'fudgepacker', 'futanari', 'gangbang', 'gaysex', 'genitals', 'giantcock', 'girlon', 'girlontop', 'girlsgonewild', 'goatcx', 'goatse', 'gokkun', 'goldenshower', 'goodpoop', 'googirl', 'goregasm', 'grope', 'groupsex', 'g-spot', 'guro', 'handjob', 'handjob', 'hardcore', 'hardcore', 'hentai', 'homoerotic', 'honkey', 'hooker', 'hotchick', 'howto kill', 'howto murder', 'hugefat', 'humping', 'incest', 'intercourse', 'jackoff', 'jailbait', 'jailbait', 'jerkoff', 'jigaboo', 'jiggaboo', 'jiggerboo', 'jizz', 'juggs', 'kike', 'kinbaku', 'kinkster', 'kinky', 'knobbing', 'leatherrestraint', 'leatherstraight jacket', 'lemonparty', 'lolita', 'lovemaking', 'makeme come', 'malesquirting', 'masturbate', 'menagea trois', 'milf', 'missionaryposition', 'motherfucker', 'moundofvenus', 'mrhands', 'muffdiver', 'muffdiving', 'nambla', 'nawashi', 'negro', 'neonazi', 'nigga', 'nigger', 'nignog', 'nimphomania', 'nipple', 'nipples', 'nsfwimages', 'nude', 'nudity', 'nympho', 'nymphomania', 'octopussy', 'omorashi', 'onecuptwogirls', 'oneguyone jar', 'orgasm', 'orgy', 'paedophile', 'panties', 'panty', 'pedobear', 'pedophile', 'pegging', 'penis', 'phonesex', 'pieceofshit', 'pissing', 'pisspig', 'pisspig', 'playboy', 'pleasurechest', 'polesmoker', 'ponyplay', 'poof', 'poopchute', 'poopchute', 'porn', 'porno', 'pornography', 'princealbert piercing', 'pthc', 'pubes', 'pussy', 'queaf', 'raghead', 'ragingboner', 'rape', 'raping', 'rapist', 'rectum', 'reversecowgirl', 'rimjob', 'rimming', 'rosypalm', 'rosypalm and her 5 sisters', 'rustytrombone', 'sadism', 'scat', 'schlong', 'scissoring', 'semen', 'sex', 'sexo', 'sexy', 'shavedbeaver', 'shavedpussy', 'shemale', 'shibari', 'shit', 'shota', 'shrimping', 'slanteye', 'slut', 's&m', 'smut', 'snatch', 'snowballing', 'sodomize', 'sodomy', 'spic', 'spooge', 'spreadlegs', 'strapon', 'strapon', 'strappado', 'stripclub', 'styledoggy', 'suck', 'sucks', 'suicidegirls', 'sultrywomen', 'swastika', 'swinger', 'taintedlove', 'tastemy', 'teabagging', 'threesome', 'throating', 'tiedup', 'tightwhite', 'tit', 'tits', 'titties', 'titty', 'tongueina', 'topless', 'tosser', 'towelhead', 'tranny', 'tribadism', 'tubgirl', 'tubgirl', 'tushy', 'twat', 'twink', 'twinkie', 'twogirls one cup', 'undressing', 'upskirt', 'urethraplay', 'urophilia', 'vagina', 'venusmound', 'vibrator', 'violetblue', 'violetwand', 'vorarephilia', 'voyeur', 'vulva', 'wank', 'wetback', 'wetdream', 'whitepower', 'womenrapping', 'wrappingmen', 'wrinkledstarfish', 'xx', 'xxx', 'yaoi', 'yellowshowers', 'yiffy', 'zoophilia' ]

  var noSpaceString = stringToBeCensored.toLowerCase().replace(/[^\w\s]/gi, '').replace(' ', '')

  for (var i = 0; i < naughtyWords.length; i++) {
    if (noSpaceString.indexOf(naughtyWords[i]) != -1) {
      return true;
    }
  } 
  return false; 
}

module.exports = DonorsChooseDonationController;
