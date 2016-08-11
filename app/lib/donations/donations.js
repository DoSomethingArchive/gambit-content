/*
 * Donation controllers are expected to implement this interface.
 *
 * @interface {
 *   string resourceName
 *   function findProject(request, response)
 *   function retrieveEmail(request, response)
 *   function retrieveFirstName(request, response)
 *   function retrieveZip(request, response)
 *   function submitDonation(request, response)
 * }
 */

var express = require('express')
  , router = express.Router();

var DonorsChoose = require('./controllers/DonorsChooseDonationController');

/**
 * Load the controller associated with the provided controller name.
 *
 * @param controllerName
 *   Name of the controller to load.
 *
 * @return controller
 */
function loadController(controllerName) {
  if (implementsInterface(DonorsChoose.prototype) &&
      controllerName == DonorsChoose.prototype.resourceName) {
    return new DonorsChoose();
  }

  // @todo Support for additional controllers can be added using the same logic.

  return null;
};

/**
 * Checks if controller implements the donations interface.
 *
 * @param controller
 *   Controller class.
 *
 * @return boolean
 */
function implementsInterface(controller) {
  if (typeof controller.resourceName === 'string' &&
      typeof controller.findProject === 'function' &&
      typeof controller.retrieveEmail === 'function' &&
      typeof controller.retrieveFirstName === 'function' &&
      typeof controller.retrieveZip === 'function' &&
      typeof controller.submitDonation === 'function') {
    return true;
  }
  else {
    return false;
  }
}

router.post('/:controller/chat', function(request, response) {
  var controller = loadController(request.params.controller);
  if (controller) {
    controller.chat(request, response);
  }
  else {
    response.status(404).send('Request not available for: ' + request.params.controller);
  }
});


/**
 * Starts the donation flow. Any validation needed before a donation flow
 * begins should happen here. This endpoint will typically need to be
 * triggered via an mData.
 */
router.post('/:controller/start', function(request, response) {
  var controller = loadController(request.params.controller);
  if (controller) {
    controller.start(request, response);
  }
  else {
    response.status(404).send('Request not available for: ' + request.params.controller);
  }
});

router.post('/:controller/retrieve-email', function(request, response) {
  var controller = loadController(request.params.controller);
  if (controller) {
    controller.retrieveEmail(request, response);
  }
  else {
    response.status(404).send('Request not available for: ' + request.params.controller);
  }
});

router.post('/:controller/retrieve-firstname', function(request, response) {
  var controller = loadController(request.params.controller);
  if (controller) {
    controller.retrieveFirstName(request, response);
  }
  else {
    response.status(404).send('Request not available for: ' + request.params.controller);
  }
});

router.post('/:controller/retrieve-zip', function(request, response) {
  var controller = loadController(request.params.controller);
  if (controller) {
    controller.retrieveZip(request, response);
  }
  else {
    response.status(404).send('Request not available for: ' + request.params.controller);
  }
});

module.exports = router;
