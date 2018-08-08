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
      broadcastable: false,
      templates: [
        'autoReply',
      ],
    },
    autoReplyBroadcast: {
      type: 'autoReplyBroadcast',
      broadcastable: true,
    },
    externalPostConfig: {
      type: 'externalPostConfig',
      postType: 'external',
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
    // Ideally we'd backfill all legacy entries as their new types, but we likely can't change the
    // the type of a Contentful entry without changing its id (if that's the case - we'd need to
    // bulk update all documents in the Conversations messages DB)
    legacyBroadcast: {
      type: 'broadcast',
      broadcastable: true,
    },
  },
};
