'use strict';

const stubs = require('../../stubs');

function getValidTextPostConfig() {
  const data = {
    sys: {
      id: '6tckfP2GgEuoOG8wieEoGu',
      contentType: {
        sys: {
          id: 'textPostConfig',
        },
      },
    },
    fields: {
      name: stubs.getRandomMessageText(),
    },
  };
  return data;
}

module.exports = {
  getValidTextPostConfig,
};
