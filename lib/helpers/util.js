'use strict';

const config = require('../../config/lib/helpers/util');

/**
 * @return {Number}
 */
function getDefaultIndexQueryLimit() {
  return config.defaultIndexQueryLimit;
}

/**
 * @param {Number} total
 * @param {Number} skip
 * @param {Number} limit
 * @return {Object}
 */
function getMeta(total = 0, skip = 0, limit) {
  return {
    pagination: {
      total,
      skip,
      limit: limit || module.exports.getDefaultIndexQueryLimit(),
    },
  };
}

/**
 * @param {string} message
 * @return {boolean}
 */
function hasLetters(message) {
  return RegExp(/[a-zA-Z]/g).test(message);
}

/**
 * TODO: Make this much better!
 * @see https://github.com/DoSomething/gambit/issues/608
 *
 * Checks if given input string contains a valid Reportback quantity.
 * @param {string} input
 * @return {boolean}
 */
function validateQuantity(quantity) {
  // Letters are invalid
  if (hasLetters(quantity)) return false;

  const numericQuantity = Number(quantity);

  if (numericQuantity && numericQuantity === parseInt(numericQuantity, 10)) {
    return true;
  }

  return false;
}

/**
 * Checks if given input string contains a valid Reportback text field.
 * @param {string} input
 * @return {boolean}
 */
function validateText(input) {
  return !!(input && input.trim().length > config.minTextLength && hasLetters(input));
}

/**
 * Trims given input with an ellipsis if its length is greater than 255|maxTextLength characters.
 * @param {string} input
 * @return {string}
 */
function trimText(input) {
  const maxLength = config.maxTextLength;
  const ellipsis = config.ellipsis;
  const keepLength = maxLength - ellipsis.length;
  let text = input.trim();

  if (text.length > maxLength) {
    text = `${text.substring(0, keepLength)}${ellipsis}`;
  }

  return text;
}

module.exports = {
  getDefaultIndexQueryLimit,
  getMeta,
  isValidQuantity: qty => validateQuantity(qty),
  isValidText: txt => validateText(txt),
  trimText: txt => trimText(txt),
};
