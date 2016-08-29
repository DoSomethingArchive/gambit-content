var request = require('request')
  , crypto = require('crypto')
  , logger = rootRequire('lib/logger')
  , RequestRetry = require('node-request-retry')
  , emitter = rootRequire('lib/eventEmitter')
  ;

var BASE_URL
  , TEST_RBID = 100
  ;

var VERSION = 'v1';
if (process.env.NODE_ENV == 'production') {
  BASE_URL = 'https://www.dosomething.org/api/' + VERSION;
}
else {
  BASE_URL = 'https://thor.dosomething.org/api/' + VERSION;
}

module.exports = function() {
  if (typeof global.dscontentapi === 'undefined') {
    global.dscontentapi = {};
  }

  return {
    userCreate: userCreate,
    userGet: userGet,
    userLogin: userLogin,
    userLogout: userLogout,
    authToken: authToken,
    campaignsReportback: campaignsReportback,
    systemConnect: systemConnect,
    TEST_RBID: TEST_RBID
  };
};

/**
 * Create user
 */
function userCreate(createData, callback) {
  var hashPassword = crypto.createHmac('sha1', process.env.DS_CONTENT_API_PASSWORD_KEY)
    .update(createData.mobile)
    .digest('hex')
    .substring(0,6);

  var body = {
    email: createData.email,
    password: hashPassword,
    mobile: createData.mobile
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
  logger.log('debug', 'phoenix.userCreate POST users mobile:%s', createData.mobile);
  request(options, _callback);
}

function onUserCreate(err, response, body) {
  if (err) {
    logger.error('phoenix.userCreate error:', err);
  }
  else {
    logger.log('info', 'phoenix.userCreate success uid:', body.uid);
  }
  if (typeof this.customCallback === 'function') {
    this.customCallback(err, response, body);
  }
}

/**
 * Get user
 */
function userGet(userData, callback) {
  logger.log('debug', 'phoenix.userGet userData:%s', JSON.stringify(userData));
  var options = {
    url: BASE_URL + '/users',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Cookie': global.dscontentapi.session_name + '=' + global.dscontentapi.sessid,
      'X-CSRF-Token': global.dscontentapi.token
    }
  };

  if (userData.email) {
    options.url += '?parameters[email]=' + encodeURIComponent(userData.email);
  }
  else if (userData.mobile) {
    options.url += '?parameters[mobile]=' + userData.mobile;
  }

  var _callback = onUserGet;
  if (typeof callback === 'function') {
    _callback = onUserGet.bind({customCallback: callback});
  }
  logger.log('debug', 'phoenix.userGet GET:%s', options.url);
  request(options, _callback)
}

function onUserGet(err, response, body) {
  if (err) {
    logger.error('phoenix.onUserGet error:', err);
  }
  else {
    logger.log('debug', 'phoenix.onUserGet body:', JSON.stringify(body));
  }
  if (typeof this.customCallback === 'function') {
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
    logger.error(err);
  }
  else if (response && response.statusCode == 200) {
    global.dscontentapi.sessid = body.sessid;
    global.dscontentapi.session_name = body.session_name;
    global.dscontentapi.token = body.token;
  }
  else {
    logger.error('Failed to authenticate to DS content API');
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
      'Cookie': global.dscontentapi.session_name + '=' + global.dscontentapi.sessid,
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
    logger.error(err);
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
      'Accept': 'application/json',
      'Cookie': global.dscontentapi.session_name + '=' + global.dscontentapi.sessid
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
    logger.error(err);
  }
  else {
    if (typeof body === 'string') {
      global.dscontentapi.token = JSON.parse(body).token;
    }
    else if (typeof body === 'object') {
      global.dscontentapi.token = body.token;
    }
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
    logger.error(err);
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
    caption: rbData.caption,
    quantity: rbData.quantity,
    why_participated: rbData.why_participated,
    file_url: rbData.file_url,
    source: 'sms-mobilecommons'
  };

  var options = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': global.dscontentapi.session_name + '=' + global.dscontentapi.sessid,
      'X-CSRF-Token': global.dscontentapi.token
    },
    body: body,
    json: true
  };

  var _callback = onCampaignsReportback;
  if (typeof callback === 'function') {
    _callback = onCampaignsReportback.bind({customCallback: callback});
  }

  // If we're in a test env, just log, emit an event, and call the callback function with test values. 
  if (process.env.NODE_ENV == 'test') {
    logger.info('dscontentapi.campaignsReportback test: ', body.uid, ' | ', body.caption, ' | ', body.quantity, ' | ', body.why_participated, ' | ', body.file_url);
    emitter.emit(emitter.events.reportbackSubmit, options);
    return callback(null, [TEST_RBID], [TEST_RBID]);
  }

  var requestRetry = new RequestRetry();
  requestRetry.setRetryConditions([400, 408, 500, isCampaignsReportbackError]);

  var url = BASE_URL + '/campaigns/' + nid + '/reportback';
  requestRetry.post(url, options, _callback);
}

/**
 * Evaluates a report back submission's response and determines if it's valid or not.
 */
function isCampaignsReportbackError(response, body) {
  if (body && body.length > 0 && body[0] != false) {
    return false;
  }
  else {
    return true;
  }
}

/**
 * Report back submission callback.
 */
function onCampaignsReportback(err, response, body) {
  if (err) {
    logger.error('phoenix.onCampaignsReportback error:', err);
  }
  else {
    logger.log('debug', 'phoenix.onCampaignsReportback body:', JSON.stringify(body));
  }

  if (isCampaignsReportbackError(response, body)) {
    err = 'Invalid body received from report back response';
  }

  if (typeof this.customCallback === 'function') {
    this.customCallback(err, response, body);
  }
}
