'use strict';

/* eslint-disable quotes */
/* eslint-disable import/no-dynamic-require */

const underscore = require('underscore');
const Chance = require('chance');

const chance = new Chance();

/**
 * @return {Object}
 */
function getAttachment() {
  return {
    url: '//images.ctfassets.net/owik07lyerdj/55kiwuII4oWWG2OiWM2E6e/fb93ab4a76c2f4a5d6c6afb1a2fc810f/doge-code.png',
    details: {
      size: 182729,
      image: {
        width: 476,
        height: 249,
      },
    },
    fileName: 'doge-code.png',
    contentType: 'image/png',
  };
}

function getAttachments() {
  return [
    {
      sys: {
        id: module.exports.getContentfulId(),
      },
      fields: {
        file: module.exports.getAttachment(),
      },
    },
  ];
}

/**
 * @return {String}
 */
function getBroadcastName() {
  return 'FeedingBetterFutures2018_Jan30_Niche_TestA';
}

/**
 * @param {Array} data
 * @return {Object}
 */
function getFetchByContentTypesResultWithArray(data) {
  return {
    meta: {
      total: data.length,
    },
    data,
  };
}

function getRandomName() {
  return `${chance.animal()} ${chance.word()}`;
}

/**
 * @return {String}
 */
function getRandomWord() {
  return chance.word();
}

module.exports = {
  getAttachment,
  rogueClient: {
    getOauth2ClientToken: (expiresInSeconds = 3600) => {
      const tokenString = 'tacos';
      return {
        id_token: tokenString,
        token_type: 'Bearer',
        expires_in: expiresInSeconds,
        access_token: tokenString,
      };
    },
    spyOnClientCredentialMethods: (sandbox, clientCredentialsInstance) => {
      sandbox.spy(clientCredentialsInstance, 'setTicker');
      sandbox.spy(clientCredentialsInstance, 'clearTicker');
      sandbox.spy(clientCredentialsInstance, 'emit');
      sandbox.spy(clientCredentialsInstance, 'renewToken');
      sandbox.spy(clientCredentialsInstance, 'setToken');
      sandbox.spy(clientCredentialsInstance, 'getAccessToken');
      sandbox.spy(clientCredentialsInstance, 'renewExpiredToken');
    },
  },
  getRandomString: function getRandomString(length) {
    return chance.string({ length: length || 5 });
  },
  getNorthstarAPIBaseUri: function getNorthstarAPIBaseUri() {
    return process.env.DS_NORTHSTAR_API_BASEURI || 'https://northstar-fake.dosomething.org/v1';
  },
  stubLogger: function stubLogger(sandbox, logger) {
    sandbox.stub(logger, 'warn').returns(underscore.noop);
    sandbox.stub(logger, 'error').returns(underscore.noop);
    sandbox.stub(logger, 'debug').returns(underscore.noop);
    sandbox.stub(logger, 'info').returns(underscore.noop);
  },
  getAPIKey: function getAPIKey() {
    return process.env.GAMBIT_API_KEY || 'totallysecret';
  },
  getCampaignId: function getCampaignId() {
    return 2299;
  },
  getCampaignRunId: function getCampaignRunId() {
    return 6677;
  },
  getBroadcastId: function getBroadcastId() {
    return this.getContentfulId();
  },
  getBroadcastName,
  getContentfulId: function getContentfulId() {
    return '5xa3oDEx4Ao0Sm2qoQCeI';
  },
  getKeyword: function getKeyword() {
    return 'bookbot';
  },
  getPlatform: function getPlatform() {
    return 'sms';
  },
  getPhotoUrl: function getPhotoUrl() {
    return 'https://www.wired.com/wp-content/uploads/2015/03/The-X-Files1-1024x768.jpg';
  },
  getPost: function getPost() {
    return { id: this.getPostId() };
  },
  getTopicContentType: function getTopicContentType() {
    return 'textPostConfig';
  },
  getPostId: function getPostId() {
    return 9040481;
  },
  getPostType: function getPostType() {
    return 'text';
  },
  getRandomMessageText: function getRandomMessageText() {
    return chance.sentence();
  },
  getRandomName,
  getRandomWord,
  getUserId: function getUserId() {
    return '597b9ef910707d07c84b00aa';
  },
  getPhoneNumber: function getPhoneNumber() {
    return '5559108329';
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
  getSignupWithTotalQuantitySubmitted: function getSignupWithTotalQuantitySubmitted() {
    const result = this.getSignupWithDraft();
    result.total_quantity_submitted = 20;
    return result;
  },
  getDraft: function getDraft() {
    return {
      _id: 'ObjectId("598091807a11380d7ae5ad86")',
      campaign: 7,
      user: '597b9ef910707d07c84b00aa',
      created_at: 'ISODate("2017-08-01T14:30:20.651Z")',
      __v: 0,
      quantity: 2,
      photo: this.getPhotoUrl(),
      caption: this.getRandomString(),
    };
  },
  helpers: {
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
      currentCampaignRun: { id: '6441' },
      reportbackInfo: {
        confirmationMessage: 'Thanks for running your book drive!',
        noun: 'Books',
        verb: 'Collected',
      },
      facts: {
        problem: 'In some low-income neighborhoods, there is only one book for every 300 children.',
      },
    };
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
      case 'gambitSignupMenu':
        msg = 'Thanks for joining {{title}}! {{fact_problem}} The solution is simple: {{tagline}} Once you have {{rb_verb}} some {{rb_noun}}, take a pic to prove it! Then text {{cmd_reportback}} to share it with us!';
        break;
      case 'externalSignupMenu':
        msg = 'Hey - this is Freddie from DoSomething. Thanks for joining {{title}}! {{fact_problem}} The solution is simple: {{tagline}} Make sure to take a photo of what you did! When you have {{rb_verb}} some {{rb_noun}}, text {{cmd_reportback}} to share your photo.';
        break;
      case 'invalidSignupMenuCommand':
        msg = 'Sorry, I didn\'t understand that. Text {{cmd_reportback}} when you have {{rb_verb}} some {{rb_noun}}. If you have a question, text {{cmd_member_support}}.';
        break;
      case 'memberSupport':
        msg = 'Text back your question and I\'ll try to get back to you within 24 hrs. If you want to continue {{title}}, text back {{keyword}}';
        break;
      case 'completedMenu':
        msg = '{{rb_confirmation_msg}} We\'ve got you down for {{quantity}} {{rb_noun}} {{rb_verb}}. Have you {{rb_verb}} more? Text {{cmd_reportback}}';
        break;
      case 'invalidCompletedMenuCommand':
        msg = 'Sorry, I didn\'t understand that. Text {{cmd_reportback}} if you have {{rb_verb}} more {{rb_noun}}. If you have a question, text {{cmd_member_support}}.';
        break;
      case 'askWhyParticipated':
        msg = 'Why was participating in {{title}} important to you? (No need to write an essay, one sentence is good).';
        break;
      // When the user sends invalid why participated , why just askWhyParticipated again
      // case 'invalid_why_participated':
      //   msg = '';
      //   break;
      case 'scheduled_relative_to_signup_date':
        msg = 'Have you completed {{title}} yet? If you have {{rb_verb}} some {{rb_noun}}, take a pic to prove it and text back {{keyword}}';
        break;
      case 'scheduled_relative_to_reportback_date':
        msg = '';
        break;
      case 'askCaption':
        msg = 'Got it! Now text back a caption for your photo (think Instagram)! Keep it short & sweet, under 60 characters please.';
        break;
      // When the user sends invalid cation, we just askCaption again
      // case 'invalid_caption':
      //   msg = '';
      //   break;
      case 'askPhoto':
        msg = 'Nice! Send your best pic of you and the {{quantity}} {{rb_noun}} you {{rb_verb}}.';
        break;
      case 'invalidPhoto':
        msg = 'Sorry, I didn\'t get that. Send a photo of the {{rb_noun}} you have {{rb_verb}}. If you have a question, text {{cmd_member_support}} - I\'ll get back to you within 24 hours.';
        break;
      case 'askQuantity':
        msg = 'Sweet! First, what\'s the total number of {{rb_noun}} you {{rb_verb}}? Send the exact number back.';
        break;
      case 'invalidQuantity':
        msg = 'What\'s the total number of {{rb_noun}} you have {{rb_verb}}? If you have a question, text {{cmd_member_support}}.';
        break;
      case 'campaignClosed':
        msg = 'Sorry, {{title}} is no longer available. Text {{cmd_member_support}} for help.';
        break;
      default:
        msg = '';
    }
    return msg;
  },
  contentful: {
    getAttachments,
    getFetchByContentTypesResultWithArray,
    getAllTemplatesForCampaignId: function getAllTemplatesForCampaignId() {
      return module.exports.getJSONstub('all-campaign-fields');
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
    /**
     * Returns a mock sys property of an item in a Contentful getEnries response.
     *
     * @param {String} contentType
     * @param {Date} date
     * @return {Object}
     */
    getSysWithTypeAndDate: function getSysWithTypeAndDate(contentType, date = Date.now()) {
      return {
        id: module.exports.getContentfulId(),
        contentType: {
          sys: {
            id: contentType,
          },
        },
        createdAt: date,
        updatedAt: date,
      };
    },
  },
  getJSONstub: function getJSONstub(name, category = 'contentful') {
    const path = `../stubs/${category}/`;
    const result = require(`${path}${name}.json`);
    return result;
  },
  phoenix: {
    getCampaign: function getCampaign() {
      return module.exports.getJSONstub('campaign', 'phoenix');
    },
  },
};
