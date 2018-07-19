'use strict';

/**
 * @param {Object} res - Express response
 * @param {Array} data
 * @param {Object} meta
 */
function sendDataAndMeta(res, data, meta) {
  return res.send({ data, meta });
}

module.exports = {
  sendDataAndMeta,
};
