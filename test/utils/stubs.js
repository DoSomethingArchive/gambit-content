'use strict';

/* eslint-disable quotes */
/* eslint-disable import/no-dynamic-require */

const underscore = require('underscore');

module.exports = {
  stubLogger: function stubLogger(sandbox, logger) {
    sandbox.stub(logger, 'warn').returns(underscore.noop);
    sandbox.stub(logger, 'error').returns(underscore.noop);
    sandbox.stub(logger, 'debug').returns(underscore.noop);
    sandbox.stub(logger, 'info').returns(underscore.noop);
  },
  getCampaignId: function getCampaignId() {
    return 2299;
  },
  getBroadcastId: function getBroadcastId() {
    return 1246319;
  },
  getKeyword: function getKeyword() {
    return 'bookbot';
  },
  getEnvironment: function getEnvironment() {
    return process.env.NODE_ENV || 'thor';
  },
  getProfileId: function getProfileId() {
    return 5559108329;
  },
  getPhoneNumber: function getPhoneNumber() {
    return '5559108329';
  },
  getKeywordContentfulObject: function getKeywordContentfulObject() {
    return {};
  },
  // Mocks a Signup populated with a draft Reportback Submission.
  getSignupWithDraft: function getSignupWithDraft() {
    return {
      _id: 4036807,
      __v: 0,
      user: '597b9ef910707d07c84b00aa',
      campaign: 7,
      draft_reportback_submission: module.exports.getDraft,
    };
  },
  getDraft: function getDraft() {
    return {
      _id: 'ObjectId("598091807a11380d7ae5ad86")',
      campaign: 7,
      user: '597b9ef910707d07c84b00aa',
      created_at: 'ISODate("2017-08-01T14:30:20.651Z")',
      __v: 0,
      quantity: 2,
      photo: 'https://www.wired.com/wp-content/uploads/2015/03/The-X-Files1-1024x768.jpg',
    };
  },
  middleware: {
    getUser: {
      getUserFromLookup: function getUserFromLookup() {
        return {
          _id: '58d2b8fe10707d6d21713c55',
          __v: 0,
          mobile: '555910832',
          first_name: 'john',
          email: 'johnsnow@secretemailclient.com',
          phoenix_id: 1654968,
          mobilecommons_id: null,
          role: 'user',
          current_campaign: 2299,
        };
      },
    },
    createNewUser: {
      getUserFromPost: function getUserFromPost() {
        return {
          _id: '58d2b8fe10707d6d21713c55',
          __v: 0,
          mobile: '555910832',
          first_name: 'john',
          email: 'johnsnow@secretemailclient.com',
          phoenix_id: 1654968,
          mobilecommons_id: null,
          role: 'user',
        };
      },
    },
  },
  helpers: {
    getValidYesResponses: function getValidYesResponses() {
      const yesResponses = process.env.GAMBIT_YES_RESPONSES || '';
      return yesResponses.split(',');
    },
    getInvalidYesResponses: function getInvalidYesResponses() {
      const invalidResponses = [
        'nah', 'ss', 'abs', 'def',
        'hell', 'tamales', 'definitely not',
      ];
      return invalidResponses;
    },
    getValidCommandValues: function getValidCommandValues() {
      return {
        member_support: process.env.GAMBIT_CMD_MEMBER_SUPPORT || 'Q',
        reportback: process.env.GAMBIT_CMD_REPORTBACK || 'START',
      };
    },
  },
  getPhoenixCampaign: function getPhoenixCampaign() {
    return {
      id: '2299',
      title: 'Two Books Blue Books',
      tagline: 'Host a Dr. Seuss book drive to benefit kids in family shelters.',
      status: 'active',
      uri: 'https://thor.dosomething.org/api/v1/campaigns/2299',
      type: 'campaign',
      currentCampaignRun: { id: '6441' },
      reportbackInfo: {
        confirmationMessage: 'Thanks for running your book drive!',
        copy: 'Submit your pic to us, and do it now. You did it well, so tell us how!',
        noun: 'Books',
        verb: 'Collected',
      },
      facts: {
        problem: 'In some low-income neighborhoods, there is only one book for every 300 children.',
      },
    };
  },
  consolebot: {
    getPostArgs: function getPostArgs() {
      return {
        args: 'hi',
      };
    },
  },

  /**
   * This function returns mocks of the response that contentful sends to Gambit when queriyng for
   * the default messages for each category here.
   *
   * TODO: This is inherently brittle, as there is no way to know when or if this default messages
   * change. We have to think of a better way to do this in the future.
   *
   * @param  {string} type message type
   * @return {string}      message mock
   */
  getDefaultContenfulCampaignMessage: function getContenfulCampaignMessage(type) {
    let msg = '';
    switch (type) {
      case 'menu_signedup_gambit':
        msg = 'Thanks for joining {{title}}! {{fact_problem}} The solution is simple: {{tagline}} Once you have {{rb_verb}} some {{rb_noun}}, take a pic to prove it! Then text {{cmd_reportback}} to share it with us!';
        break;
      case 'menu_signedup_external':
        msg = 'Hey - this is Freddie from DoSomething. Thanks for joining {{title}}! {{fact_problem}} The solution is simple: {{tagline}} Make sure to take a photo of what you did! When you have {{rb_verb}} some {{rb_noun}}, text {{cmd_reportback}} to share your photo.';
        break;
      case 'invalid_cmd_signedup':
        msg = 'Sorry, I didn\'t understand that. Text {{cmd_reportback}} when you have {{rb_verb}} some {{rb_noun}}. If you have a question, text {{cmd_member_support}}.';
        break;
      case 'member_support':
        msg = 'Text back your question and I\'ll try to get back to you within 24 hrs. If you want to continue {{title}}, text back {{keyword}}';
        break;
      case 'menu_completed':
        msg = '{{rb_confirmation_msg}} We\'ve got you down for {{quantity}} {{rb_noun}} {{rb_verb}}. Have you {{rb_verb}} more? Text {{cmd_reportback}}';
        break;
      case 'invalid_cmd_completed':
        msg = 'Sorry, I didn\'t understand that. Text {{cmd_reportback}} if you have {{rb_verb}} more {{rb_noun}}. If you have a question, text {{cmd_member_support}}.';
        break;
      case 'ask_why_participated':
        msg = 'Why was participating in {{title}} important to you? (No need to write an essay, one sentence is good).';
        break;
      // When the user sends invalid why participated , why just ask_why_participated again
      // case 'invalid_why_participated':
      //   msg = '';
      //   break;
      case 'scheduled_relative_to_signup_date':
        msg = 'Have you completed {{title}} yet? If you have {{rb_verb}} some {{rb_noun}}, take a pic to prove it and text back {{keyword}}';
        break;
      case 'scheduled_relative_to_reportback_date':
        msg = '';
        break;
      case 'ask_caption':
        msg = 'Got it! Now text back a caption for your photo (think Instagram)! Keep it short & sweet, under 60 characters please.';
        break;
      // When the user sends invalid cation, we just ask_caption again
      // case 'invalid_caption':
      //   msg = '';
      //   break;
      case 'ask_photo':
        msg = 'Nice! Send your best pic of you and the {{quantity}} {{rb_noun}} you {{rb_verb}}.';
        break;
      case 'no_photo_sent':
        msg = 'Sorry, I didn\'t get that. Send a photo of the {{rb_noun}} you have {{rb_verb}}. If you have a question, text {{cmd_member_support}} - I\'ll get back to you within 24 hours.';
        break;
      case 'ask_quantity':
        msg = 'Sweet! First, what\'s the total number of {{rb_noun}} you {{rb_verb}}? Send the exact number back.';
        break;
      case 'invalid_quantity':
        msg = 'What\'s the total number of {{rb_noun}} you have {{rb_verb}}? If you have a question, text {{cmd_member_support}}.';
        break;
      case 'campaign_closed':
        msg = 'Sorry, {{title}} is no longer available. Text {{cmd_member_support}} for help.';
        break;
      default:
        msg = '';
    }
    return msg;
  },
  contentful: {

    getAllFieldsForCampaign: function getAllFieldsForCampaign() {
      return module.exports.getJSONstub('all-campaign-fields');
    },

    // Returns an object that is formatted in-place
    // in lib/contentful's method: fetchKeywordsForCampaignId.
    // We should be returning raw JSON data that we get from contentful here!
    // TODO: Refactor when we format response in a separate function (testable)
    // instead of in-place inside the promise's callback
    getKeywords: function getKeywords() {
      return [{ keyword: 'BOOKBOT' }];
    },

    /**
     * Gets entries from contentful
     *
     * @param  {string} contentType the type of entries we are looking for
     * @return {Object}             The parsed JSON mock of a response from the server
     */
    getEntries: function getEntries(contentType) {
      const path = '../stubs/contentful/';
      const result = require(`${path}get-entries-${contentType}.json`);
      return result;
    },
  },
  getJSONstub: function getJSONstub(name, category = 'contentful') {
    const path = `../stubs/${category}/`;
    const result = require(`${path}${name}.json`);
    return result;
  },
};
