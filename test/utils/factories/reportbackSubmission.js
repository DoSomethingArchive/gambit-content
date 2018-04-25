'use strict';

const Chance = require('chance');
const ObjectID = require('mongoose').Types.ObjectId;
const ReportbackSubmission = require('../../../app/models/ReportbackSubmission');

const chance = new Chance();

module.exports.getValidReportbackSubmission = function getValidReportbackSubmission() {
  return new ReportbackSubmission({
    _id: new ObjectID(),
    quantity: chance.natural({ min: 2, max: 500 }),
    photo: 'http://placekitten.com/200/300',
    caption: chance.sentence({ words: 5 }),
    why_participated: chance.sentence(),
  });
};
