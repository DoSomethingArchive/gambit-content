'use strict';

module.exports = function getContentfulKeywords() {
  return (req, res) => {
    res.send({ data: req.campaigns });
  };
};
