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

SGSoloController.prototype.processRequest = function(request, response) {

	if (typeof request.query.story_id === 'undefined'
		|| typeof request.query.story_type === 'undefined'
    || typeof request.body.phone === 'undefined') {
    response.send(406, 'Missing required params.');
    return false
  }

  var createPayload = {
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

  var createUrl = 'http://' + this.host + '/sms-multiplayer-game/create'; 

  var startPayload = {
    form: {
      args: 'Y',
      phone: request.body.phone, 
      story_type: request.query.story_type
    }
  }

  var startUrl = 'http://' + this.host + '/sms-multiplayer-game/alpha-start';

  // POST request to create game. 
  requestHttp.post(createUrl, createPayload, function(err, response, body) {
    if (err) {
      console.log(err);
    } 
    else {
      if (response && response.statusCode) {
        console.log('POST to ' + createUrl + ' returned status code: ' + response.statusCode);
      } 
      // POST request to start game, using the alphaStartGame function on the 
      // SGCompetitiveStoryController. Keep in mind that when we develop 
      // other gameplay structures (i.e., "collaborative", we'll need to refactor.)
      requestHttp.post(startUrl, startPayload, function(err, response, body) {
        console.log(startPayload)
        if (err) {
          console.log(err);
        } 
        else if (response && response.statusCode) {
          console.log('POST to ' + startUrl + ' returned status code: ' + response.statusCode);
          // this.app.stathatReport('Count', 'mobilecommons: start solo game request: success', 1);
        }
      })
    }
  })
  response.send();
}

module.exports = SGSoloController;
