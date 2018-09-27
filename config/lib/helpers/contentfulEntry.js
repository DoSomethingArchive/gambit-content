'use strict';

/**
 * This maps the fields in our Contentful types into broadcast, topic, and defaultTopicTriggers.
 *
 * Content types with either a templates or postType property set are returned as topics.
 * If the type contains a templates array, each array item should correspond to a single value text
 * field defined on the content type, which is used as a bot reply template in the topic.
 * If the type contains a postType string property instead, its an older content type and its
 * templates are configured via config/lib/helpers/topic. Ideally we should consolidate, but it'd
 * take a bit of refactoring as the topic helper config contains default values for certain text
 * fields to use if the field values are blank.
 *
 * A broadcastable content type currently requires a text field named "text" and attachments field
 * named "attachments" to define content for the outbound broadcast. If a topic reference field
 * exists, it will include the topic in the outbound message, indicating that the conversation topic
 * should be updated upon receiving the broadcast (otherwise, the broadcast itself can be used as a
 * topic if it has templates -- e.g. askYesNo)
 */
module.exports = {
  contentTypes: {
    askSubscriptionStatus: {
      type: 'askSubscriptionStatus',
      broadcastable: true,
    },
    askVotingPlanStatus: {
      type: 'askVotingPlanStatus',
      broadcastable: true,
      templates: [
        'invalidVotingPlanStatus',
        'saidVoting',
        'saidNotVoting',
      ],
    },
    askYesNo: {
      type: 'askYesNo',
      broadcastable: true,
      templates: [
        'saidYes',
        'saidNo',
        'invalidAskYesNoResponse',
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
    photoPostBroadcast: {
      type: 'photoPostBroadcast',
      broadcastable: true,
    },
    photoPostConfig: {
      type: 'photoPostConfig',
      postType: 'photo',
    },
    textPostBroadcast: {
      type: 'textPostBroadcast',
      broadcastable: true,
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
