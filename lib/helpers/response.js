'use strict';

const utilHelper = require('./util');

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
function sendIndexData(res, data, meta) {
  return res.send({
    data,
    meta: meta || utilHelper.getMeta(data.length),
  });
}

module.exports = {
  sendData,
  sendIndexData,
};
