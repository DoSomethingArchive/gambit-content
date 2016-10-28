'use strict';

class UnprocessibleEntityError extends Error {

  constructor(message) {
    super(message);
  }

}

module.exports = UnprocessibleEntityError;
