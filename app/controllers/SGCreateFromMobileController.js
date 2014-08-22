/**
 * Guides users through creating an SMS multiplayer game from mobile.
 */

var mobilecommons = require('../../mobilecommons/mobilecommons')
  ;

var SGCreateFromMobileController = function(app) {
  this.app = app;
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

  // @todo When collaborative and most-likely-to games happen, set configs here.
  // Verify game type and id are valid.
  if (request.query.story_type == 'competitive-story') {
    this.gameConfig = this.app.get('competitive-stories');
  }
  else {
    response.send(406, 'Invalid story_type.')
    return false;
  }

  if (typeof this.gameConfig[request.query.story_id] === 'undefined') {
    response.send(406, 'Game config not setup for story ID: ' + request.query.story_id);
    return false;
  }

  var self = this;
  self.request = request;
  self.response = response;

  // Query for an existing game creation config doc.
  var queryConfig = this.configModel.findOne({phone: request.body.phone});
  var promiseConfig = queryConfig.exec();
  promiseConfig.then(function(configDoc) {

    // If no document found, then create one.
    if (configDoc == null) {
      // We don't ask for the first name yet, so just saving it as phone for now.
      var doc = {
        alpha_mobile: self.request.body.phone,
        alpha_first_name: self.request.body.phone,
        story_id: self.request.query.story_id,
        story_type: self.request.query.story_type
      };

      return self.configModel.create(doc);
    }
    else {
      console.log('doc found');
      console.log(configDoc)
    }

  }).then(function(doc) {
    // Config model has been successfully created
    console.log(doc);
  });

  response.send();
};

module.exports = SGCreateFromMobileController;
