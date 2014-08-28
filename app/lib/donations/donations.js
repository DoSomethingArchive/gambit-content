/*
 * Donation controllers are expected to implement this interface.
 *
 * @interface {
 *   string resourceName
 *   function findProject(POST body, response)
 *   function retrieveEmail(POST body, response)
 *   function retrieveFirstName(POST body, response)
 *   function retrieveLocation(POST body, response)
 *   function submitDonation(POST body, response)
 * }
 */
var DonorsChoose = require('./controllers/DonorsChooseDonationController')
  ;

module.exports = function(app) {

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
      return new DonorsChoose(app);
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
        typeof controller.submitDonation === 'function') {
      return true;
    }
    else {
      return false;
    }
  }

  app.post('/donations/:controller/find-project', function(request, response) {
    var controller = loadController(request.params.controller);
    if (controller) {
      controller.findProject(request.body, response);
    }
    else {
      response.send(404, 'Request not available for: ' + request.params.controller);
    }
  });

  app.post('/donations/:controller/retrieve-email', function(request, response) {
    var controller = loadController(request.params.controller);
    if (controller) {
      controller.retrieveEmail(request.body, response);
    }
    else {
      response.send(404, 'Request not available for: ' + request.params.controller);
    }
  });

  app.post('/donations/:controller/retrieve-firstname', function(request, response) {
    var controller = loadController(request.params.controller);
    if (controller) {
      controller.retrieveFirstName(request.body, response);
    }
    else {
      response.send(404, 'Request not available for: ' + request.params.controller);
    }
  });

  app.post('/donations/:controller/retrieve-location', function(request, response) {
    var controller = loadController(request.params.controller);
    if (controller) {
      controller.retrieveLocation(request.body, response);
    }
    else {
      response.send(404, 'Request not available for: ' + request.params.controller);
    }
  });

  app.post('/donations/:controller/submit-donation', function(request, response) {
    var controller = loadController(request.params.controller);
    if (controller) {
      controller.submitDonation(request.body, response);
    }
    else {
      response.send(404, 'Request not available for: ' + request.params.controller);
    }
  });
};
