var logger = rootRequire('app/lib/logger')
  ;

/**
 * Normalizes a phone number for processing. Prepends the '1' US international
 * code to the phone number if it doesn't have it.
 *
 * @param phone
 *   Phone number to normalize.
 *
 * @return Normalized phone number string.
 */
module.exports.getNormalizedPhone = function(phone) {
  if (!phone) {
    logger.error('smsHelper.getNormalizedPhone has been passed an undefined phone value.', console.trace());
    return '';
  }

  var newPhone = phone.replace(/\D/g, '');
  if (newPhone.length === 10) {
    newPhone = '1' + newPhone;
  }

  return newPhone;
};

/**
 * Checks if a phone number is valid.
 *
 * @param phone
 *   Phone number to check.
 *
 * @return true if valid. false, otherwise.
 */
module.exports.isValidPhone = function(phone) {
  if (phone.length === 11) {
    return true;
  }
  else {
    return false;
  }
};

/**
 * Returns the first word in a given message.
 *
 * @param message
 *   String message to parse.
 *
 * @return First word of the message.
 */
function getFirstWord(message) {
  var m = message.trim();
  if (m.indexOf(' ') >= 0) {
    return m.substr(0, m.indexOf(' '));
  }
  else {
    return m;
  }
};
module.exports.getFirstWord = getFirstWord;

/**
 * Determines whether or not the first word in the given message is 'YES' or a
 * variation of it.
 *
 * @param message
 *   String message to parse.
 *
 * @return Boolean
 */
module.exports.isYesResponse = function(message) {
  var m = message.toUpperCase().trim();
  m = getFirstWord(m);

  var yesResponses = [
    'Y',
    'YA',
    'YAH',
    'YAS',
    'YEA',
    'YEAH',
    'YEP',
    'YES',
    'YUP'
  ];

  if (yesResponses.indexOf(m) >= 0) {
    return true;
  }
  else {
    return false;
  }
}


