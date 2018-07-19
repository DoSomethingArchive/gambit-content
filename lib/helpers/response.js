'use strict';

/**
 * @param {Object} res - Express response
 * @param {Object} data
 * @param {Object} meta
 */
function sendData(res, data) {
  return res.send({ data });
}

/**
 * @param {Object} res - Express response
 * @param {Array} data
 * @param {Object} meta
 */
function sendDataAndMeta(res, data, meta) {
  return res.send({ data, meta });
}

module.exports = {
  sendData,
  sendDataAndMeta,
};
