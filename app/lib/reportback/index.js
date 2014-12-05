/**
 * Submit report backs to the Drupal backend via SMS.
 */

var express = require('express')
  , router = express.Router()
  , config = require('./reportback-config.json')
  , model = require('./reportbackModel')
  , mobilecommons = require('../../../mobilecommons')
  , emitter = require('../../eventEmitter')
  ;

router.post('/:campaign', function(request, response) {
  var campaign;
  var phone;
  var requestData;
  
  // Check that we have a config setup for this campaign
  campaign = request.params.campaign;
  if (typeof config[request.params.campaign] !== 'undefined') {
    phone = request.body.phone;
    
    // Find document for this user 
    findDocument(phone)
      .then(function(doc) {
        return onDocumentFound(doc, phone, campaign);
      })
      .then(function(doc) {
        requestData = {
          campaign: campaign,
          phone: phone,
          args: request.body.args,
          mms_image_url: request.body.mms_image_url,
          profile_first_completed_campaign_id: request.body.profile_first_completed_campaign_id
        };
        handleUserResponse(doc, requestData);
      });

    response.send();
  }
  else {
    response.status(404).send('Request not available for ' + request.params.campain);
  }
});

module.exports = router;

/**
 * Find the current report back document for a user.
 *
 * @param phone
 *   Phone number of user
 */
function findDocument(phone) {
  return model.findOne({'phone': phone}).exec();
}

/**
 * Called when findDocument is complete.
 *
 * @param doc
 *   Document found, if any
 * @param phone
 *   Phone number of user
 * @param campaign
 *   Campaign endpoint
 */
function onDocumentFound(doc, phone, campaign) {
  if (doc) {
    return;
  }
  else {
    // Create a document if none was found
    return model.create({'phone': phone, 'campaign': campaign});
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
  if (!doc.photo) {
    receivePhoto(doc, data);
  }
  else if (!doc.quantity) {
    receiveQuantity(doc, data);
  }
  else if(!doc.why_important) {
    receiveWhyImportant(doc, data);
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
  var photoUrl = data.mms_image_url;
  if (!photoUrl) {
    mobilecommons.profile_update(data.phone, config[data.campaign].message_not_a_photo);
  }
  else {
    model.update(
      {phone: data.phone},
      {'$set': {photo: photoUrl}},
      function(err, num, raw) {
        if (!err) {
          emitter.emit(emitter.events.reportbackModelUpdate);
        }
      });

    mobilecommons.profile_update(data.phone, config[data.campaign].ask_quantity);
  }
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
  var answer = data.args;
  model.update(
    {phone: data.phone},
    {'$set': {quantity: answer}},
    function(err, num, raw) {
      if (!err) {
        emitter.emit(emitter.events.reportbackModelUpdate);
      }
    });

  mobilecommons.profile_update(data.phone, config[data.campaign].ask_why);
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
  var answer = data.args;
  model.update(
    {phone: data.phone},
    {'$set': {why_important: answer}},
    function(err, num, raw) {
      if (!err) {
        emitter.emit(emitter.events.reportbackModelUpdate);
      }
    });

  doc.why_important = answer;
  completeReportBack(doc, data);
}

/**
 * Complete the report back flow.
 *
 * @param doc
 *   User's report back document
 * @param data
 *   Data from the user's request
 */
function completeReportBack(doc, data) {
  var customFields = {};
  var campaignConfig = config[data.campaign];

  // @todo send POST request to ds.org reportback endpoint

  // If this is the first campaign a user's completed, save it
  if (data.profile_first_completed_campaign_id) {
    customFields.profile_first_completed_campaign_id = campaignConfig.campaign_completed_id;
  }

  // Send message to user that their report back is complete
  mobilecommons.profile_update(data.phone, campaignConfig.message_complete, customFields);

  // Opt user out of campaign, if specified
  if (config[data.campaign].campaign_optout_id) {
    mobilecommons.optout({
      phone: data.phone,
      campaignId: campaignConfig.campaign_optout_id
    });
  }
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
  module.exports.receivePhoto = receivePhoto;
  module.exports.receiveQuantity = receiveQuantity;
  module.exports.receiveWhyImportant = receiveWhyImportant;
  module.exports.completeReportBack = completeReportBack;
}
