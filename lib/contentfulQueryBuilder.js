'use strict';

/**
 * Query Builder class
 */
class QueryBuilder {
  constructor() {
    this.query = {};
  }
  /**
   * @param {Array} contentTypes
   */
  contentTypes(contentTypes) {
    // @see https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/search-parameters/inclusion
    this.query['sys.contentType.sys.id[in]'] = contentTypes.join(',');
    return this;
  }
  /**
   * @param {String} id
   */
  contentfulId(id) {
    this.query['sys.id'] = id;
    return this;
  }
  /**
   * @param {String} id
   */
  campaignId(id) {
    this.query['fields.campaignId'] = id;
    return this;
  }
  custom(queryObject = {}) {
    const keys = Object.keys(queryObject);
    keys.forEach((queryKey) => {
      this.query[queryKey] = queryObject[queryKey];
    });
    return this;
  }
  orderByDescCreatedAt() {
    this.query.order = '-sys.createdAt';
    return this;
  }
  build() {
    return this.query;
  }
}

module.exports = QueryBuilder;
