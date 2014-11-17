// Will call Bitly API to shorten links. Function should be pretty simple, should just 1) take in a longURL, query the Bitly API while authenticating with our BITLY_GENERIC_ACCESS_TOKEN, and then return the shortened URL. 

/**
 * Shortens a URL using the custom DoSomething.org Bitly API. 
 *
 * @param longURL
 *   the URL to be shortened 
 * @param callback
 *   the callback function to be called, taking a single param of the shortened URL
 * @return shortURL
 *   a shortened form of the long URL
 */

var requestHttp = require('request')
  , logger = require('../logger')
  ;

var bitlyToken = (process.env.BITLY_GENERIC_ACCESS_TOKEN || null);
var baseURL = 'https://api-ssl.bitly.com'; // alternate: api.bitly.com
var appendURL = '/v3/shorten';

function shortenLink(longURL, callback) {
  var longURL = encodeURIComponent(longURL.trim());
  var apiURL = baseURL + appendURL + '?' + 'uri=' + longURL + '&' + 'access_token=' + bitlyToken;

  requestHttp.get(apiURL, function(error, response, body) {
    if (!error) {
      var bitlyResponse;
      try {
        bitlyResponse = JSON.parse(body).data.url;
        if (typeof callback === 'function') {
          callback(bitlyResponse);
          return;
        }
      }
      catch (e) {
        // JSON.parse will throw a SyntaxError exception if data is not valid JSON
        logger.error('Invalid JSON data received from Bitly API.');
        response.status(500).send('Invalid JSON data received from Bitly API.');
        return;
      }
    }
    else {
      logger.error('bitly.shortenLink error: ', err);
    }
  });
}

module.exports = shortenLink;
