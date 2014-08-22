/**
 * Guides users through creating an SMS multiplayer game from mobile.
 */

var mobilecommons = require('../../mobilecommons/mobilecommons')
  ;

var SGCreateFromMobileController = function(app) {
  this.configModel = require('../models/sgGameCreateConfig')(app);
};

/**
 * Receives a user's mobile responses through the create game process.
 *
 * @param request
 *   Express request object.
 * @param response
 *   Express response object.
 */
SGCreateFromMobileController.prototype.processRequest = function(request, response) {

  if (typeof request.query.story_id === 'undefined'
      || typeof request.query.story_type === 'undefined'
      || typeof request.body.phone === 'undefined'
      || typeof request.body.args === 'undefined') {
    response.send(406, 'Missing required params.');
    return false;
  }

  response.send();
};

module.exports = SGCreateFromMobileController;
