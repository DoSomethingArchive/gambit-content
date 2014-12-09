var request = require('request')
  , crypto = require('crypto')
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
    userCreate: userCreate,
    userLogin: userLogin,
    userLogout: userLogout,
    authToken: authToken,
    campaignsReportback: campaignsReportback,
    systemConnect: systemConnect
  };
};

/**
 * Create user
 */
function userCreate(createData, callback) {
  var hashPassword = crypto.createHmac('sha1', process.env.DS_CONTENT_API_PASSWORD_KEY)
    .update(createData.phone)
    .digest('hex')
    .substring(0,6);

  var body = {
    email: createData.phone + '@mobile',
    password: hashPassword,
    phone: createData.phone
  };

  if (createData.birthdate) {
    body.birthdate = createData.birthdate;
  }

  if (createData.first_name) {
    body.first_name = createData.first_name;
  }

  if (createData.last_name) {
    body.last_name = createData.last_name;
  }

  if (createData.user_registration_source) {
    body.user_registration_source = createData.user_registration_source;
  }

  var options = {
    url: BASE_URL + '/users',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: body,
    json: true
  };

  var _callback = onUserCreate;
  if (typeof callback === 'function') {
    _callback = onUserCreate.bind({customCallback: callback});
  }

  request(options, _callback);
}

function onUserCreate(err, response, body) {
  if (this.customCallback === 'function') {
    this.customCallback(err, response, body);
  }
}

/**
 * Login
 */
function userLogin(username, password, callback) {
  var options = {
    url: BASE_URL + '/auth/login',
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

  var _callback = onUserLogin;
  if (typeof callback === 'function') {
    _callback = onUserLogin.bind({customCallback: callback});
  }

  request(options, _callback);
}

function onUserLogin(err, response, body) {
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
function userLogout(callback) {
  var options = {
    url: BASE_URL + '/auth/logout',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-CSRF-Token': global.dscontentapi.token
    }
  };

  var _callback = onUserLogout;
  if (typeof callback === 'function') {
    _callback = onUserLogout.bind({customCallback: callback});
  }

  request(options, _callback);
}

function onUserLogout(err, response, body) {
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
    global.dscontentapi.token = jsonBody.token;
  }

  if (typeof this.customCallback === 'function') {
    this.customCallback(err, response, body);
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
function campaignsReportback(rbData, callback) {
  var nid = rbData.nid;
  var body = {
    uid: rbData.uid,
    quantity: rbData.quantity,
    why_participated: rbData.why_participated,
    file_url: rbData.file_url
  };

  var options = {
    url: BASE_URL + '/campaigns/' + nid + '/reportback',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-CSRF-Token': global.dscontentapi.token,
      'Cookie': global.dscontentapi.session_name + '=' + global.dscontentapi.sessid
    },
    body: body,
    json: true
  };

  var _callback = onCampaignsReportback;
  if (typeof callback === 'function') {
    _callback = onCampaignsReportback.bind({customCallback: callback});
  }

  request(options, _callback);
}

function onCampaignsReportback(err, response, body) {
  if (err) {
    console.log(err);
  }

  if (typeof this.customCallback === 'function') {
    this.customCallback(err, response, body);
  }
}
