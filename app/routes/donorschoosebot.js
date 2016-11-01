'use strict';

/**
 * Imports.
 */
const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const superagent = require('superagent');
const donorschoose = require('../../lib/donorschoose');
const helpers = require('../../lib/helpers');
const logger = app.locals.logger;

/**
 * Setup.
 */
const COUNT_FIELD = process.env.DONORSCHOOSE_DONATION_COUNT_FIELDNAME || 'ss2016_donation_count';
const MAX_DONATIONS_ALLOWED = (process.env.DONORSCHOOSE_MAX_DONATIONS_ALLOWED || 5);

function sendResponse(res, code, msgType, profileUpdate) {
  logger.debug(`dcbot sendResponse:${msgType} profileUpdate:${JSON.stringify(profileUpdate)}`);

  // TODO: Refactor to store donorsChooseBot instead of Controller once ready to drecpate.
  const bot = app.locals.controllers.donorsChooseBot.bot;
  const property = `msg_${msgType}`;
  // TODO: Post to Mobile Commons Profile

  return helpers.sendResponse(res, 200, bot[property]);
}

router.post('/', (req, res) => {
  let incomingMessage = req.body.args;
  if (!incomingMessage) {
    return helpers.sendResponse(res, 422, 'Missing required args.');
  }

  incomingMessage = helpers.getFirstWord(incomingMessage);
  logger.debug(`dcbot incomingMessage:${incomingMessage}`);

  const profileFieldName = `profile_${COUNT_FIELD}`;
  const numDonations = req.body[profileFieldName];

  if (numDonations >= MAX_DONATIONS_ALLOWED) {
    return sendResponse(res, 200, 'max_donations_reached');
  }

  // If start param passed, initiate conversation, ignoring incomingMessage.
  const prompt = req.query.start;

  if (!req.body.profile_postal_code) {
    if (prompt) {
      return sendResponse(res, 200, 'ask_zip');
    }
    if (!helpers.isValidZip(incomingMessage)) {
      return sendResponse(res, 200, 'invalid_zip');
    }

    return sendResponse(res, 200, 'ask_first_name', { postal_code: incomingMessage });
  }

  if (!req.body.profile_first_name) {
    if (prompt) {
      return sendResponse(res, 200, 'ask_first_name');
    }
    if (helpers.containsNaughtyWords(incomingMessage) || !helpers.hasLetters(incomingMessage)) {
      return sendResponse(res, 200, 'invalid_first_name');
    }

    return sendResponse(res, 200, 'ask_email', { first_name: incomingMessage });
  }

  if (!req.body.profile_email) {
    if (prompt) {
      return sendResponse(res, 200, 'ask_email');
    }
    if (!helpers.isValidEmail(incomingMessage)) {
      return sendResponse(res, 200, 'invalid_email');
    }
  }

  // We've made it this far, time to donate.
  // TODO: When time to post to MC Profile, we'll need to save email if !req.body.profile_email.

  const donationAmount = (process.env.DONORSCHOOSE_DONATION_AMOUNT || 10);
  const olderThan = process.env.DONORSCHOOSE_PROPOSALS_OLDERTHAN;
  const zip = req.body.profile_postal_code;

  const apiKey = process.env.DONORSCHOOSE_API_KEY;
  const apiPassword = process.env.DONORSCHOOSE_API_PASSWORD;
  // Find a project for zip code that has at least DONATION_AMOUNT left to completion.
  const proposalsUri = donorschoose.getProposalsQueryUrl(zip, donationAmount, olderThan);
  const donationsUri = `${donorschoose.getDonationsPostUrl()}?APIKey=${apiKey}`;
  logger.debug(donationsUri);
  let selectedProposal;

  return superagent.get(proposalsUri)
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json')
    .then((response) => {
      const body = JSON.parse(response.text);
      if (body.proposals.length < 1) {
        logger.error(`'No proposals found for zip ${zip}`);
        // TODO: Inform User, either by throwing an error or adding a no projects found message.
      }

      return body.proposals[0];
    })
    .then((proposal) => {
      selectedProposal = proposal;

      // Submitting a Donation request first requires requesting a transaction token.
      // @see https://data.donorschoose.org/docs/transactions/
      return superagent.post(donationsUri)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .type('form')
        .send({
          APIKey: apiKey,
          apipassword: apiPassword,
          action: 'token',
        });
    })
    .then((response) => {
      const requestTokenResponse = JSON.parse(response.text);
      if (requestTokenResponse.statusDescription !== 'success') {
        throw new Error('DonorsChoose request token failed.');
      }

      const donorEmail = process.env.DONORSCHOOSE_DEFAULT_EMAIL || 'donorschoose@dosomething.org';
      const data = {
        APIKey: apiKey,
        apipassword: apiPassword,
        action: 'donate',
        token: requestTokenResponse.token,
        proposalId: selectedProposal.id,
        amount: donationAmount,
        email: donorEmail,
        honoreeEmail: req.body.profile_email,
        honoreeFirst: req.body.profile_first_name,
      };

      return superagent.post(donationsUri)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .type('form')
        .send(data);
    })
    .then((response) => {
      const body = JSON.parse(response.text);

      return res.status(200).send(body);
    })
    .catch(err => res.status(err.status).send(err.message));
});

module.exports = router;
