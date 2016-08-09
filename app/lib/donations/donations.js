/*
 * Donation controllers are expected to implement this interface.
 *
 * @interface {
 *   string resourceName
 *   function findProject(request, response)
 *   function retrieveEmail(request, response)
 *   function retrieveFirstName(request, response)
 *   function retrieveLocation(request, response)
 *   function submitDonation(request, response)
 *   function setHost(hostname)
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
      typeof controller.retrieveLocation === 'function' &&
      typeof controller.submitDonation === 'function' &&
      typeof controller.setHost === 'function') {
    return true;
  }
  else {
    return false;
  }
}

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

router.post('/:controller/find-project', function(request, response) {
  var controller = loadController(request.params.controller);
  if (controller) {
    controller.setHost(request.get('host'));
    controller.findProject(request, response);
  }
  else {
    response.status(404).send('Request not available for: ' + request.params.controller);
  }
});

router.post('/:controller/retrieve-email', function(request, response) {
  var controller = loadController(request.params.controller);
  if (controller) {
    controller.setHost(request.get('host'));
    controller.retrieveEmail(request, response);
  }
  else {
    response.status(404).send('Request not available for: ' + request.params.controller);
  }
});

router.post('/:controller/retrieve-firstname', function(request, response) {
  var controller = loadController(request.params.controller);
  if (controller) {
    controller.setHost(request.get('host'));
    controller.retrieveFirstName(request, response);
  }
  else {
    response.status(404).send('Request not available for: ' + request.params.controller);
  }
});

router.post('/:controller/retrieve-location', function(request, response) {
  var controller = loadController(request.params.controller);
  if (controller) {
    controller.setHost(request.get('host'));
    controller.retrieveLocation(request, response);
  }
  else {
    response.status(404).send('Request not available for: ' + request.params.controller);
  }
});

module.exports = router;
