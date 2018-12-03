'use strict';

/**
 * @return {Boolean}
 */
function isCacheReset(req) {
  return req.query.cache === 'false';
}

module.exports = {
  isCacheReset,
};
