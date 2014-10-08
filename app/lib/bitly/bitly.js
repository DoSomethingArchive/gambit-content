// Will call Bitly API to shorten links. Function should be pretty simple, should just 1) take in a longURL, query the Bitly API while authenticating with our BITLY_GENERIC_ACCESS_TOKEN, and then return the shortened URL. 

/**
 * Shortens a URL using the custom DoSomething.org Bitly API. 
 *
 * @param longURL
 *   the URL to be shortened 
 * @return shortURL
 *   a shortened form of the long URL
 */

var requestHttp = require('request');

var bitlyToken = (process.env.BITLY_GENERIC_ACCESS_TOKEN || null);
var baseURL = 'https://api-ssl.bitly.com'; // alternate: api.bitly.com
var appendURL = '/v3/shorten';

function shortenLink(longURL) {
  var longURL = encodeURIComponent(longURL.trim());
  var apiURL = baseURL + appendURL + '?' + 'uri=' + longURL + '&' + 'access_token=' + bitlyToken;

  requestHttp.get(apiURL, function(error, response, body) {
    if (!error) {
      var bitlyResponse;
      try {
        bitlyResponse = JSON.parse(body).data.url;
        return bitlyResponse;
      }
      catch (e) {
        // JSON.parse will throw a SyntaxError exception if data is not valid JSON
        console.log('Invalid JSON data received from Bitly API.');
        res.send(500, 'Invalid JSON data received from Bitly API.');
        return;
      }
    }
    else {
      console.log('error: ', err)
    }
  });
}

module.exports = shortenLink;