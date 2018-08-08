'use strict';

/**
 * This maps the fields in our Contentful types into broadcast, topic, and defaultTopicTriggers.
 *
 * Content types with templates set are returned as topics. Each item in the templates array is a
 * single value text field to be used as a bot reply template while in the topic.
 *
 * A broadcastable content type currently requires a text field named "text" and attachments field
 * named "attachments" to define content for the outbound broadcast.
 *
 */
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
