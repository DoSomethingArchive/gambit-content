'use strict';

/**
 * Subscribe phone number to a Mobile Commons opt-in path.
 *
 * @param phone
 *  Phone number to subscribe.
 * @param oip
 *   Opt-in path to subscribe to.
 */

var mobilecommons = require('../../mobilecommons/mobilecommons')
 , messageHelper = require('../lib/userMessageHelpers')
 , requestHttp = require('request')
 ;

function sendSMS(phone, oip) {
  var args = {
    alphaPhone: phone,
    alphaOptin: oip
  };
  mobilecommons.optin(args);
};

var SGSoloController = function(app, host) {
	this.app = app;
	this.host = host;
}

var SGSoloController.prototype.processRequest = function(request, response) {

	if (typeof request.query.story_id === 'undefined'
		|| typeof request.query.story_type === 'undefined'
    || typeof request.body.phone === 'undefined'
    || typeof request.body.args === 'undefined') {
    response.send(406, 'Missing required params.');
    return false
  }

  var payload = {
    form: {
      story_id: request.query.story_id,
      story_type: request.query.story_type,
      game_type: 'solo',
      alpha_mobile: request.body.phone,
      alpha_first_name: request.body.phone, // We didn't ask for user's name, saving it as phone for now.
      beta_mobile_0: '',
      beta_mobile_1: '',
      beta_mobile_2: ''
    }
  }

  var url = 'http://' + this.host + '/sms-multiplayer-game/create'; 

  requestHttp.post(url, doc, function(err, response, body) {
    if (err) {
      console.log(err);
    } 

    if (response && response.statusCode) {
      console.log('POST to ' + url + ' returned status code: ' + response.statusCode);
    }
  })

}

module.exports = SGSoloController;
