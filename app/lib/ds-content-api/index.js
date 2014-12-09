var request = require('request')
  ;

var BASE_URL;
var VERSION = 'v1';
if (process.env.NODE_ENV == 'production') {
  BASE_URL = 'https://www.dosomething.org/api/' + VERSION;
}
else {
  BASE_URL = 'http://staging.beta.dosomething.org/api/' + VERSION;
}

module.exports = function() {
  if (typeof global.dscontentapi === 'undefined') {
    global.dscontentapi = {};
  }

  return {
    login: login,
    logout: logout,
    authToken: authToken,
    reportBack: reportBack,
    systemConnect: systemConnect
  };
};

/**
 * Login
 */
function login(username, password, callback) {
  var url = BASE_URL + '/auth/login';
  var options = {
    url: url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: {
      username: username,
      password: password
    },
    json: true
  };

  var _callback = onLogin;
  if (typeof callback === 'function') {
    _callback = onLogin.bind({customCallback: callback});
  }

  request(options, _callback);
}

function onLogin(err, response, body) {
  if (err) {
    console.log(err);
  }
  else if (response && response.statusCode == 200) {
    global.dscontentapi.sessid = body.sessid;
    global.dscontentapi.session_name = body.session_name;
    global.dscontentapi.token = body.token;
  }
  else {
    console.log('Failed to authenticate to DS content API');
  }

  if (typeof this.customCallback === 'function') {
    this.customCallback(err, response, body);
  }
}

/**
 * Logout
 */
function logout(callback) {
  var options = {
    url: BASE_URL + '/auth/logout',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-CSRF-Token': global.dscontentapi.token
    }
  };

  var _callback = onLogout;
  if (typeof callback === 'function') {
    _callback = onLogout.bind({customCallback: callback});
  }

  request(options, _callback);
}

function onLogout(err, response, body) {
  if (err) {
    console.log(err);
  }

  if (typeof this.customCallback === 'function') {
    this.customCallback(err, response, body);
  }
}

/**
 * Get the authentication token.
 */
function authToken(callback) {
  var options = {
    url: BASE_URL + '/auth/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  var _callback = onAuthToken;
  if (typeof callback === 'function') {
    _callback = onAuthToken.bind({customCallback: callback});
  }

  request(options, _callback);
}

function onAuthToken(err, response, body) {
  if (err) {
    console.log(err);
  }
  else {
    var jsonBody = JSON.parse(body)
    console.log('AUTH TOKEN');
    console.log(jsonBody);

    global.dscontentapi.token = jsonBody.token;
  }
}

/**
 * System connect.
 */
function systemConnect(callback) {
  var options = {
    url: BASE_URL + '/system/connect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  var _callback = onSystemConnect;
  if (typeof callback === 'function') {
    _callback = onSystemConnect.bind({customCallback: callback});
  }

  request(options, _callback);
}

function onSystemConnect(err, response, body) {
  if (err) {
    console.log(err);
  }

  if (typeof this.customCallback === 'function') {
    this.customCallback(err, response, body);
  }
}

/**
 * Submit a report back.
 */
function reportBack(rbData, callback) {
  var nid = 1334;
  var uid = 21;
  var quantity = 10;
  var why = '(test string)';
  var fileurl = 'http://www.howtodrawmanga3d.com/sites/default/files/styles/related-content/public/hiroshi/thumbnails/how_draw_pikachu.jpg';
  var caption = '';

  var options = {
    url: BASE_URL + '/campaigns/' + nid + '/reportback',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-CSRF-Token': global.dscontentapi.token,
      'Cookie': global.dscontentapi.session_name + '=' + global.dscontentapi.sessid
    },
    body: {
      uid: 21,
      quantity: quantity,
      why_participated: why,
      file_url: fileurl,
      caption: caption
    },
    json: true
  };

  var _callback = onReportBack;
  if (typeof callback === 'function') {
    _callback = onReportBack.bind({customCallback: callback});
  }

  request(options, _callback);
}

function onReportBack(err, response, body) {
  if (err) {
    console.log(err);
  }

  if (typeof this.customCallback === 'function') {
    this.customCallback(err, response, body);
  }
}
