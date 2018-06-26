'use strict';

const stubs = require('../stubs');

/**
 * @return {Object}
 */
function getValidTopic() {
  return {
    id: stubs.getContentfulId(),
    name: stubs.getRandomMessageText(),
    type: 'textPostConfig',
    postType: 'text',
  };
}

module.exports = {
  getValidTopic,
};
