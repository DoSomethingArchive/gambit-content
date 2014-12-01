'use strict';

/**
 * Subscribe phone number to a Mobile Commons opt-in path.
 *
 * @param phone
 *  Phone number to subscribe.
 * @param oip
 *   Opt-in path to subscribe to.
 */

var requestHttp = require('request')
 , logger = require('../../logger')
 ;

var SGSoloController = function(host) {
	this.host = host;
}

SGSoloController.prototype.createSoloGame = function(hostUrl, storyId, storyType, phone, delay) {
  var createUrl = 'http://' + hostUrl + '/sms-multiplayer-game/create'; 
  var createPayload = {
    form: {
      story_id: storyId,
      story_type: storyType,
      game_type: 'solo',
      alpha_mobile: phone,
      alpha_first_name: phone, // We didn't ask for user's name, saving it as phone for now.
      beta_mobile_0: '',
      beta_mobile_1: '',
      beta_mobile_2: ''
    }
  }
  
  var startUrl = 'http://' + hostUrl + '/sms-multiplayer-game/alpha-start';
  var startPayload = {
    form: {
      args: 'Y',
      phone: phone, 
      story_type: storyType
    }
  }

  // POST request to create game. 
  requestHttp.post(createUrl, createPayload, function(err, response, body) {
    if (err) {
      logger.error(err);
    } 
    else {
      if (response && response.statusCode) {
        logger.info('Solo player creating game - POST to ' + createUrl + ' returned status code: ' + response.statusCode);
      } 
      // POST request to start game, using the alphaStartGame function on the 
      // SGCompetitiveStoryController. Keep in mind that when we develop 
      // other gameplay structures (i.e., "collaborative", we'll need to refactor.)
      requestHttp.post(startUrl, startPayload, function(err, response, body) {
        if (err) {
          logger.error(err);
        } 
        else if (response && response.statusCode) {
          logger.info('Solo player starting game - POST to ' + startUrl + ' returned status code: ' + response.statusCode);
          app.stathatReport('Count', 'sms-games: start solo game: success: story_id=' + createPayload.form.story_id, 1);
        }
      })
    }
  })
}

SGSoloController.prototype.processRequest = function(request, response) {
  if (typeof request.query.story_id === 'undefined'
    || typeof request.query.story_type === 'undefined'
    || typeof request.body.phone === 'undefined') {
    response.status(406).send('Missing required params.');
    return false;
  }

  this.createSoloGame(request.get('host'), request.query.story_id, request.query.story_type, request.body.phone);

  response.send();
}

module.exports = SGSoloController;