'use strict';

module.exports = {
  contentTypes: {
    askYesNo: {
      type: 'askYesNo',
      templates: [
        'saidYes',
        'saidNo',
        'invalidAskYesNoResponse',
        'autoReply',
      ],
    },
    // TODO: Deprecate this type? if an externalPostConfig didn't require a campaign, a campaignless
    // externalPostConfig seems it could take the place of our survey_response Rivescript topic.
    autoReplyBroadcast: {
      type: 'autoReplyBroadcast',
      templates: [
        'autoReply',
      ],
    },
    // Ideally we'd backfill all legacy entries as their new types, but we likely can't change the
    // the type of a Contentful entry without changing its id (if that's the case - we'd need to
    // bulk update all documents in the Conversations messages DB)
    legacy: {
      type: 'broadcast',
      templates: [],
    },
  },
};
