/**
 * Submits reportbacks (and new users) to Phoenix API via SMS.
 */

var express = require('express')
  , router = express.Router()
  , connectionOperations = rootRequire('app/config/connectionOperations')
  , model = require('./reportbackModel')(connectionOperations)
  , mobilecommons = rootRequire('lib/mobilecommons')
  , emitter = rootRequire('app/eventEmitter')
  , logger = rootRequire('lib/logger')
  , phoenix = rootRequire('lib/phoenix')()
  , REPORTBACK_PERMALINK_BASE_URL
  , shortenLink = rootRequire('lib/bitly')
  , Q = require('q')
  , parseForDigits = require('count-von-count')
  ;

if (process.env.NODE_ENV == 'production') {
  REPORTBACK_PERMALINK_BASE_URL = 'https://www.dosomething.org/reportback/';
}
else {
  REPORTBACK_PERMALINK_BASE_URL = 'https://thor.dosomething.org/reportback/';
}

/**
 * Single endpoint through which a reportback is created, populated and
 * submitted. The expected reportback flow is that a user is asked for a photo,
 * a caption, the reportback quantity and finally why it's important to them.
 *
 * POST /reportback/:campaignName
 *
 * Query Params:
 *   config_override - (optional) use the config taggedwith this config_override.
 *     By default, we use the campaign value in the URL to find the config with
 *     the matching endpoint value.
 *   save_to - (optional) force this response to save to the specified field
 *     Valid options: photo, caption, quantity, why_important
 *
 * Body Params:
 *   args - the user's text response
 *   mms_image_url - if set, the URL of the photo the user submitted
 *   phone - the user's phone number
 *   profile_first_completed_campaign_id - if set, the id of the first Mobile
 *     Commons campaign the user has completed
 */
router.post('/:campaign', function(request, response) {
  var campaignName = request.params.campaign;
  logger.log('verbose', '/reportback/%s request.body:', campaignName, JSON.stringify(request.body));
  var campaignConfig
    , phone
    , requestData
    , i
    ;
  
  // Get the config either from the override or the campaign value in the URL
  if (request.query.config_override) {
    campaignConfig = app.getConfig(app.ConfigName.REPORTBACK, request.query.config_override, 'config_override');
  }
  else {
    campaignConfig = app.getConfig(app.ConfigName.REPORTBACK, campaignName, 'endpoint');
  }

  if (typeof campaignConfig !== 'undefined') {
    phone = request.body.phone;
    
    // Find document for this user 
    findDocument(phone, campaignConfig.endpoint)
      .then(function(doc) {
          return onDocumentFound(doc, phone, campaignConfig);
        }, function(err) {
          logger.error('/reportback/%s reportback.findDocument: error', campaignName, err);
        })
      .then(function(doc) {
          requestData = {
            campaignConfig: campaignConfig,
            phone: phone,
            args: request.body.args,
            mms_image_url: request.body.mms_image_url,
            profile_first_completed_campaign_id: request.body.profile_first_completed_campaign_id,
            save_to: request.query.save_to
          };
          handleUserResponse(doc, requestData);
        }, function(err) {
          logger.error('reportback.onDocumentFound:', err);
        });

    response.send();
  }
  else {
    response.status(404).send('Request not available for ' + request.params.campaign);
  }
});

module.exports = router;

/**
 * Find the current report back document for a user.
 *
 * @param phone
 *   Phone number of user
 * @param endpoint
 *   Campaign endpoint identifier
 */
function findDocument(phone, endpoint) {
  return model.findOne({'phone': phone, 'campaign': endpoint}).exec();
}

/**
 * Called when findDocument is complete.
 *
 * @param doc
 *   Document found, if any
 * @param phone
 *   Phone number of user
 * @param campaignConfig
 *   Campaign config
 */
function onDocumentFound(doc, phone, campaignConfig) {
  if (doc) {
    logger.log('debug', 'reportback.onDocumentFound existing doc:%s', JSON.stringify(doc));
    return doc;
  }
  else {
    var newDoc = model.create({'phone': phone, 'campaign': campaignConfig.endpoint});
    logger.log('debug', 'reportback.onDocumentFound created doc:%s', JSON.stringify(doc));
    return newDoc;
  }
}

/**
 * Determine what data we just received from the user based on the state of the
 * user's report back document.
 *
 * @param doc
 *   User's report back document
 * @param data
 *   Data from the user's request
 */
function handleUserResponse(doc, data) {
  var override = data.save_to;

  if (override === 'photo' || (!override && !doc.photo)) {
    receivePhoto(doc, data);
  }
  else if (override === 'caption' || (!override && !doc.caption)) {
    receiveCaption(doc, data);
  }
  else if (override === 'quantity' || (!override && !doc.quantity)) {
    receiveQuantity(doc, data);
  }
  else if (override === 'why_important' || (!override && !doc.why_important)) {
    receiveWhyImportant(doc, data);
  }
  else {
    logger.error('reportback.handleUserResponse blank for user:%s doc:%s', data.phone, JSON.stringify(doc));
  }
}

/**
 * Process request for user who has sent a photo.
 *
 * @param doc
 *   User's report back document
 * @param data
 *   Data from the user's request
 */
function receivePhoto(doc, data) {
  logReportbackStep(doc, data);
  var photoUrl = data.mms_image_url;
  if (!photoUrl) {
    mobilecommons.optin({alphaPhone: data.phone, alphaOptin: data.campaignConfig.message_not_a_photo});
  }
  else {
    model.update(
      {phone: data.phone, campaign: doc.campaign},
      {'$set': {photo: photoUrl}},
      function(err, num, raw) {
        if (!err) {
          emitter.emit(emitter.events.reportbackModelUpdate);
        }
      });

    mobilecommons.optin({alphaPhone: data.phone, alphaOptin: data.campaignConfig.message_caption});
  }
}

/**
 * Process request for user who is sending the caption for the photo.
 *
 * @param doc
 *   User's report back document
 * @param data
 *   Data from the user's request
 */
function receiveCaption(doc, data) {
  logReportbackStep(doc, data);
  var answer = data.args;
  model.update(
    {phone: data.phone, campaign: doc.campaign},
    {'$set': {caption: answer}},
    function(err, num, raw) {
      if (!err) {
        emitter.emit(emitter.events.reportbackModelUpdate);
      }
    });

  mobilecommons.optin({alphaPhone: data.phone, alphaOptin: data.campaignConfig.message_quantity});
}

/**
 * Process request for user who is answering with a quantity.
 *
 * @param doc
 *   User's report back document
 * @param data
 *   Data from the user's request
 */
function receiveQuantity(doc, data) {
  logReportbackStep(doc, data);
  var answer = data.args;
  var quantity = parseForDigits(answer);
  if (quantity) {
    model.update(
      {phone: data.phone, campaign: doc.campaign},
      {'$set': {quantity: quantity}},
      function(err, num, raw) {
        if (!err) {
          emitter.emit(emitter.events.reportbackModelUpdate);
        }
      });
    mobilecommons.optin({alphaPhone: data.phone, alphaOptin: data.campaignConfig.message_why});
  }
  else {
    mobilecommons.optin({alphaPhone: data.phone, alphaOptin: data.campaignConfig.message_quantity_sent_invalid});
  }
}

/**
 * Process request for user who is answering why this is important.
 *
 * @param doc
 *   User's report back document
 * @param data
 *   Data from the user's request
 */
function receiveWhyImportant(doc, data) {
  logReportbackStep(doc, data);
  var answer = data.args;
  model.update(
    {phone: data.phone, campaign: doc.campaign},
    {'$set': {why_important: answer}},
    function(err, num, raw) {
      if (!err) {
        emitter.emit(emitter.events.reportbackModelUpdate);
      }
    });

  doc.why_important = answer;
  findUserUidThenReportBack(doc, data);
}

function logReportbackStep(doc, data) {
  logger.log('debug', arguments.callee.caller.name + ':%s doc:%s ', data.args , JSON.stringify(doc));
}

/**
 * Find the user's UID based on the phone number. Submit the report back if a user
 * is found. Otherwise, create a user first then submit the report back.
 *
 * @param doc
 *   User's report back document
 * @param data
 *   Data from the user's request
 */
function findUserUidThenReportBack(doc, data) {
  var phone = data.phone;
  var userData;
  var context;

  // Remove the international code (users typically don't include it when entering their number)
  if (data.phone.length == 11) {
    phone = data.phone.substr(1);
  }

  userData = {
    mobile: phone
  };

  context = {
    data: data,
    doc: doc,
    isInitialSearch: true
  };
  phoenix.userGet(userData, onFindUserUid.bind(context));
}

function onFindUserUid(err, response, body) {
  var context;

  // Variables bound to the callback
  var data = this.data;
  var doc = this.doc;
  var isInitialSearch = this.isInitialSearch;

  var jsonBody = JSON.parse(body);
  if (jsonBody.length == 0) {
    // If the initial search couldn't find the user, search again with country code.
    // This is because Phoenix mobile number values currently contain a mix of numbers
    // with and without leading country code.
    if (isInitialSearch) {
      userData = {
        mobile: data.phone
      };

      context = {
        data: data,
        doc: doc,
        isInitialSearch: false,
      };
      logger.log('debug', 'reportback.onFindUserUid 2nd phoenix.userGet:%s', JSON.stringify(userData));
      phoenix.userGet(userData, onFindUserUid.bind(context));
    }
    // If we still can't find the user, create an account and then submit report back.
    else {
      createUserThenReportback(doc, data);
    }
  }
  else {
    // User account found. Submit the report back.
    submitReportback(jsonBody[0].uid, doc, data);
  }
}

/**
 * Create a user account and then submit report back for the new user.
 *
 * @param doc
 *   User's report back document
 * @param data
 *   Data from the user's request
 */
function createUserThenReportback(doc, data) {
  var phone = data.phone;
  var userData;

  // Strip the international code for user registration data
  if (data.phone.length == 11) {
    phone = data.phone.substr(1);
  }

  userData = {
    email: phone + '@mobile.import',
    mobile: phone,
    user_registration_source: process.env.DS_CONTENT_API_USER_REGISTRATION_SOURCE
  };

  phoenix.userCreate(userData, function(err, response, body) {
    if (body && body.uid) {
      submitReportback(body.uid, doc, data);
    }
    else {
      logger.error('reportback.createUserThenReportback error:%s for user:' + phone,  JSON.stringify(error));
    }
  });
}

/**
 * Submit a report back.
 *
 * @param uid
 *   Numeric Phoenix User uid
 * @param doc
 *   User's reportback document
 * @param data
 *   Data from the user's request
 */
function submitReportback(uid, doc, data) {
  logger.log('debug', 'reportback.submitReportback uid:%s doc:%s data:', uid, JSON.stringify(doc), JSON.stringify(data));
  var data = data
    , rbData = {
        nid: data.campaignConfig.campaign_nid,
        uid: uid,
        caption: doc.caption,
        quantity: doc.quantity,
        why_participated: doc.why_important,
        file_url: doc.photo
      }
    ;

  function reportbackToDS() {
    var deferred = Q.defer();
    phoenix.campaignsReportback(rbData, function(err, response, body) {
      if (!err && body && body.length > 0) {
        try {
          var rbId = body[0]
          // Checking to make sure the response body doesn't contain an error from the API. 
          if (rbId == false || isNaN(rbId)) {
            logger.error('reportback.reportbackToDS no rbid for uid: ' + uid);
          }
          else {
            var rbLink = REPORTBACK_PERMALINK_BASE_URL + rbId;
            logger.info('reportback.reportbackToDS:%s', rbLink);
            deferred.resolve(rbId);
          }
        }
        catch (e) {
          logger.error('reportback.reportbackToDS uid:%s error:%s', uid, JSON.stringify(error));
        }
      }
      else {
        logger.error('reportback.reportbackToDS uid:%s error:%s', uid, JSON.stringify(error));
        deferred.reject('Unable to reportback to DS API for uid: ' + uid);
      }
    });
    return deferred.promise;
  }

  function shortenLinkAndUpdateMCProfile(rbId) {
    shortenLink(REPORTBACK_PERMALINK_BASE_URL + rbId, function(shortenedLink) {
      var optinArgs = {
        alphaPhone: data.phone,
        alphaOptin: data.campaignConfig.message_complete
      };

      // Remove http:// or https:// protocol 
      shortenedLink = shortenedLink.replace(/.*?:\/\//g, "")

      // Here, update the user profile in mobile commons 1) the campaign id of the campaign, if it's their first one,
      // and 2) the URL of their submitted reportback. Then send the "completed" message. 
      if (data.profile_first_completed_campaign_id) {
        optinArgs.profile_first_completed_campaign_id = data.campaignConfig.campaign_completed_id;
      }

      optinArgs.last_reportback_url = shortenedLink;
      mobilecommons.optin(optinArgs);

      // Opt user out of campaign, if specified
      if (data.campaignConfig.campaign_optout_id) {
        mobilecommons.optout({
          phone: data.phone,
          campaignId: data.campaignConfig.campaign_optout_id
        });
      }

      // Remove the reportback doc upon successful submission.
      model.remove({phone: data.phone, campaign: data.campaignConfig.endpoint}).exec();
    })
  }

  reportbackToDS().then(shortenLinkAndUpdateMCProfile, function(err) {
      if (err) {
        logger.error('Unable to reportback to DS API for uid: ' + uid + ', error: ' + err);
      }
    }
  );
}

/**
 *
 * Exposing private functions for tests.
 *
 */
if (process.env.NODE_ENV === 'test') {
  module.exports.findDocument = findDocument;
  module.exports.onDocumentFound = onDocumentFound;
  module.exports.handleUserResponse = handleUserResponse;
  module.exports.receiveCaption = receiveCaption;
  module.exports.receivePhoto = receivePhoto;
  module.exports.receiveQuantity = receiveQuantity;
  module.exports.receiveWhyImportant = receiveWhyImportant;
  module.exports.REPORTBACK_PERMALINK_BASE_URL = REPORTBACK_PERMALINK_BASE_URL;
}