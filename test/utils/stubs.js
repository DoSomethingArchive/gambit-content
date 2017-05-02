'use strict';

module.exports = {
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
  // Returns an object that is formatted in-place
  // in lib/contentful's method: fetchKeywordsForCampaignId.
  // We should be returning raw JSON data that we get from contentful here!
  // TODO: Refactor when we format response in a separate function (testable)
  // instead of in-place inside the promise's callback
  getKeywords: function getKeywords() {
    return [{ keyword: 'BOOKBOT' }];
  },

  /**
   * For query:
   *  {
   *    content_type: 'keyword',
   *    'fields.environment': 'thor',
   *    'fields.campaign.sys.contentType.sys.id': 'campaign',
   *    'fields.campaign.fields.campaignId': '2299'
   *  }
   */
  getEntries: function getEntries() {
    /* eslint-disable quotes */
    return JSON.parse(`{"sys":{"type":"Array"},"total":1,"skip":0,"limit":100,"items":[{"sys":{"space":{"sys":{"type":"Link","linkType":"Space","id":"owik07lyerdj"}},"id":"3mMeUatw00GqQ0gAM86ICq","type":"Entry","createdAt":"2017-02-06T18:12:19.388Z","updatedAt":"2017-02-15T19:19:48.571Z","revision":2,"contentType":{"sys":{"type":"Link","linkType":"ContentType","id":"keyword"}},"locale":"en-US"},"fields":{"keyword":"bookbot","environment":"thor","campaign":{"sys":{"space":{"sys":{"type":"Link","linkType":"Space","id":"owik07lyerdj"}},"id":"68Oy1FcaR2EiaMieicaoom","type":"Entry","createdAt":"2017-02-15T19:19:34.100Z","updatedAt":"2017-02-15T19:19:34.100Z","revision":1,"contentType":{"sys":{"type":"Link","linkType":"ContentType","id":"campaign"}},"locale":"en-US"},"fields":{"campaignId":"2299"}}}}],"includes":{"Entry":[{"sys":{"space":{"sys":{"type":"Link","linkType":"Space","id":"owik07lyerdj"}},"id":"68Oy1FcaR2EiaMieicaoom","type":"Entry","createdAt":"2017-02-15T19:19:34.100Z","updatedAt":"2017-02-15T19:19:34.100Z","revision":1,"contentType":{"sys":{"type":"Link","linkType":"ContentType","id":"campaign"}},"locale":"en-US"},"fields":{"campaignId":"2299"}},{"sys":{"space":{"sys":{"type":"Link","linkType":"Space","id":"owik07lyerdj"}},"id":"3mMeUatw00GqQ0gAM86ICq","type":"Entry","createdAt":"2017-02-06T18:12:19.388Z","updatedAt":"2017-02-15T19:19:48.571Z","revision":2,"contentType":{"sys":{"type":"Link","linkType":"ContentType","id":"keyword"}},"locale":"en-US"},"fields":{"keyword":"bookbot","environment":"thor","campaign":{"sys":{"type":"Link","linkType":"Entry","id":"68Oy1FcaR2EiaMieicaoom"}}}}]}}`);
  },
};
