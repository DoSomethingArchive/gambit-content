/**
 * Submit report backs to the Drupal backend via SMS.
 */

var express = require('express')
  , router = express.Router()
  , config = require('./reportback-config.json')
  , model = require('./reportbackModel')
  ;

router.post('/:campaign', function(request, response) {
  var campaign;
  var phone;
  var funcName;
  
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
        nextStep(doc, phone, campaign);
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
 *   Phone number of user.
 */
function findDocument(phone) {
  return model.findOne({'phone': phone}).exec();
}

/**
 * Called when findDocument is complete.
 *
 * @param doc
 *   Document found, if any.
 * @param phone
 *   Phone number of user.
 * @param campaign
 *   Campaign endpoint.
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

function nextStep(doc, phone, campaign) {
  if (!doc.photo) {
    receivePhoto();
  }
  else if (!doc.quantity) {
    receiveQuantity();
  }
  else if(!doc.why_important) {
    receiveWhyImportant();
  }
}

function receivePhoto() {

}

function receiveQuantity() {

}

function receiveWhyImportant() {

}

function receiveCaption() {

}

function completeReportBack() {

}

function sendPhotoNotReceived() {

}

function sendComplete() {

}

function sendQuantity() {

}

function sendWhyImportant() {

}

function sendCaption() {

}
