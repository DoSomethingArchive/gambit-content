'use strict';

function isTextPost(req) {
  return req.postType === 'text';
}

module.exports = {
  isTextPost,
};
