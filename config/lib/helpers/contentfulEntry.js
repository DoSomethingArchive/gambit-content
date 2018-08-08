'use strict';

module.exports = {
  contentTypes: {
    askYesNo: {
      type: 'askYesNo',
      broadcastable: true,
      templates: [
        'saidYes',
        'saidNo',
        'invalidAskYesNoResponse',
        'autoReply',
      ],
    },
    autoReply: {
      type: 'autoReply',
      templates: [
        'autoReply',
      ],
    },
    autoReplyBroadcast: {
      type: 'autoReplyBroadcast',
      broadcastable: true,
    },
    defaultTopicTrigger: {
      type: 'defaultTopicTrigger',
    },
    message: {
      type: 'message',
    },
    photoPostConfig: {
      type: 'photoPostConfig',
      postType: 'photo',
    },
    textPostConfig: {
      type: 'textPostConfig',
      postType: 'text',
    },
    // Legacy types:
    // Ideally we'd backfill all legacy entries as their new types, but we likely can't change the
    // the type of a Contentful entry without changing its id (if that's the case - we'd need to
    // bulk update all documents in the Conversations messages DB)
    // This externalPostConfig type will deprecated by an autoReply:
    externalPostConfig: {
      type: 'externalPostConfig',
      postType: 'external',
    },
    legacyBroadcast: {
      type: 'broadcast',
      broadcastable: true,
    },
  },
};
