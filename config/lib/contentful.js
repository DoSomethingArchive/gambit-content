'use strict';

module.exports = {
  clientOptions: {
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  },
  defaultCampaignId: process.env.CONTENTFUL_DEFAULT_CAMPAIGN_ID || 'default',
  /**
   *  The sequence we define properties here determines the order they appear
   *  in GET Gambit Campaigns API response. Should match the sequence defined
   *  in Contentful, which is based on the order in
   *  which our end user will see the templates.
   *
   *  { templateName: 'contentfulCampaignFieldName'}
   */
  campaignFields: {
    gambitSignupMenu: 'gambitSignupMenuMessage',
    externalSignupMenu: 'externalSignupMenuMessage',
    invalidSignupMenuCommand: 'invalidSignupMenuCommandMessage',
    askQuantity: 'askQuantityMessage',
    invalidQuantity: 'invalidQuantityMessage',
    askPhoto: 'askPhotoMessage',
    invalidPhoto: 'invalidPhotoMessage',
    askCaption: 'askCaptionMessage',
    invalidCaption: 'invalidCaptionMessage',
    askWhyParticipated: 'askWhyParticipatedMessage',
    invalidWhyParticipated: 'invalidWhyParticipatedMessage',
    completedMenu: 'completedMenuMessage',
    invalidCompletedMenuCommand: 'invalidCompletedMenuCommandMessage',
    memberSupport: 'memberSupportMessage',
    campaignClosed: 'campaignClosedMessage',
    errorOccurred: 'errorOccurredMessage',
    askSignup: 'askSignupMessage',
    declinedSignup: 'declinedSignupMessage',
    invalidAskSignupResponse: 'invalidSignupResponseMessage',
    askContinue: 'askContinueMessage',
    declinedContinue: 'declinedContinueMessage',
    invalidAskContinueResponse: 'invalidContinueResponseMessage',
    // TODO: Remove these when Conversations goes live.
    // They won't be used anymore, so we didn't bother to rename these.
    scheduled_relative_to_signup_date: 'scheduledRelativeToSignupDateMessage',
    scheduled_relative_to_reportback_date: 'scheduledRelativeToReportbackDateMessage',
  },
};
