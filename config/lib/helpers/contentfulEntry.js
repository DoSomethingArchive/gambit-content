'use strict';

const templateFieldTypes = {
  text: 'text',
  transition: 'transition',
};

/**
 * This maps the fields in our Contentful types into broadcast, topic, and defaultTopicTriggers.
 *
 * Content types with either a templates or postType property set are returned as topics.
 *
 * If the type contains a templates object, each property defines the Contentful field name and type
 * to use as a template within the topic.
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
 *
 * A transitionable content type requires a text field named "text" and a reference field "topic".
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
      templates: {
        // These template names correspond to the macros that get executed if user matches a trigger
        // within the ask_voting_plan_status topic in Gambit Conversations.
        // @see https://github.com/DoSomething/gambit-conversations/blob/master/brain/topics/askVotingPlanStatus.rive
        votingPlanStatusCantVote: {
          fieldName: 'cantVoteTransition',
          fieldType: templateFieldTypes.transition,
          name: 'votingPlanStatusCantVote',
        },
        votingPlanStatusNotVoting: {
          fieldName: 'notVotingTransition',
          fieldType: templateFieldTypes.transition,
          name: 'votingPlanStatusNotVoting',
        },
        votingPlanStatusVoted: {
          fieldName: 'votedTransition',
          fieldType: templateFieldTypes.transition,
          name: 'votingPlanStatusVoted',
        },
      },
    },
    askYesNo: {
      type: 'askYesNo',
      broadcastable: true,
      templates: {
        invalidAskYesNoResponse: {
          fieldName: 'invalidAskYesNoResponse',
          fieldType: templateFieldTypes.text,
          name: 'invalidAskYesNoResponse',
        },
        saidYes: {
          fieldName: 'yesTransition',
          fieldType: templateFieldTypes.transition,
          name: 'saidYes',
        },
        saidNo: {
          fieldName: 'noTransition',
          fieldType: templateFieldTypes.transition,
          name: 'saidNo',
        },
      },
    },
    autoReply: {
      type: 'autoReply',
      templates: {
        autoReply: {
          fieldName: 'autoReply',
          fieldType: templateFieldTypes.text,
          name: 'autoReply',
        },
      },
    },
    autoReplyBroadcast: {
      type: 'autoReplyBroadcast',
      broadcastable: true,
    },
    autoReplyTransition: {
      type: 'autoReplyTransition',
      transitionable: true,
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
      // TODO: Refactor photoPostConfig in config/lib/helpers/topic here to DRY.
      postType: 'photo',
    },
    photoPostTransition: {
      type: 'photoPostTransition',
      transitionable: true,
    },
    textPostBroadcast: {
      type: 'textPostBroadcast',
      broadcastable: true,
    },
    textPostConfig: {
      type: 'textPostConfig',
      // TODO: Move textPostConfig in config/lib/helpers/topic here to DRY.
      postType: 'text',
    },
    textPostTransition: {
      type: 'textPostTransition',
      transitionable: true,
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
  templateFieldTypes,
};
