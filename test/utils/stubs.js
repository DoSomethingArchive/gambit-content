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
  getDefaultContenfulCampaignMessage: function getDefaultContenfulCampaignMessage() {
    return 'Have you completed {{title}} yet? If you have {{rb_verb}} some {{rb_noun}}, take a pic to prove it and text back {{keyword}}';
  },
  getKeywords: function getKeywords() {
    return [{ keyword: 'BOOKBOT' }];
  },
};
