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
