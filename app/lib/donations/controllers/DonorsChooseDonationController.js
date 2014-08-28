function DonorsChooseDonationController(app) {
  this.app = app;
};

/**
 * Resource name identifier. Routes will use this to specify the controller to use.
 */
DonorsChooseDonationController.prototype.resourceName = 'donors-choose';

/**
 * Finds a project based on user input. Also responsible for sending the
 * project details back to the user.
 *
 * @param requestBody
 *   Params received through a POST request
 * @param response
 *   Express Response object
 */
DonorsChooseDonationController.prototype.findProject = function(requestBody, response) {
  response.send();
};

/**
 * Retrieves an email from the user to submit with the donation transaction. For
 * a Donors Choose donation, this is optional.
 *
 * @param requestBody
 *   Params received through a POST request
 * @param response
 *   Express Response object
 */
DonorsChooseDonationController.prototype.retrieveEmail = function(requestBody, response) {
  response.send();
};

/**
 * Retrieves the users first name to submit with the donation transaction.
 *
 * @param requestBody
 *   Params received through a POST request
 * @param response
 *   Express Response object
 */
DonorsChooseDonationController.prototype.retrieveFirstName = function(requestBody, response) {
  response.send();
};

/**
 * Retrieves the location of a user to use for finding a project. For Donors Choose
 * this will be the user's state.
 *
 * @param requestBody
 *   Params received through a POST request
 * @param response
 *   Express Response object
 */
DonorsChooseDonationController.prototype.retrieveLocation = function(requestBody, response) {
  response.send();
};

/**
 * Submits a donation transaction to Donors Choose.
 *
 * @param requestBody
 *   Params received through a POST request
 * @param response
 *   Express Response object
 */
DonorsChooseDonationController.prototype.submitDonation = function(requestBody, response) {
  response.send();
};

module.exports = DonorsChooseDonationController;
