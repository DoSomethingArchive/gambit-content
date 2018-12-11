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
        /**
         * These template names correspond to the macros that get executed if user matches a trigger
         * within the ask_voting_plan_status topic in Gambit Conversations.
         * @see https://github.com/DoSomething/gambit-conversations/blob/master/brain/topics/askVotingPlanStatus.rive
         */
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
      templates: {
        startPhotoPostAutoReply: {
          fieldName: 'invalidSignupMenuCommandMessage',
          fieldType: templateFieldTypes.text,
          name: 'startPhotoPostAutoReply',
        },
        completedPhotoPost: {
          fieldName: 'completedMenuMessage',
          fieldType: templateFieldTypes.text,
          name: 'completedPhotoPost',
        },
        completedPhotoPostAutoReply: {
          fieldName: 'invalidCompletedMenuCommandMessage',
          fieldType: templateFieldTypes.text,
          name: 'completedPhotoPostAutoReply',
        },
        askQuantity: {
          fieldName: 'askQuantityMessage',
          fieldType: templateFieldTypes.text,
          name: 'askQuantity',
        },
        invalidQuantity: {
          fieldName: 'invalidQuantityMessage',
          fieldType: templateFieldTypes.text,
          name: 'invalidQuantity',
        },
        askPhoto: {
          fieldName: 'askPhotoMessage',
          fieldType: templateFieldTypes.text,
          name: 'askPhoto',
        },
        invalidPhoto: {
          fieldName: 'invalidPhotoMessage',
          fieldType: templateFieldTypes.text,
          name: 'invalidPhoto',
        },
        askCaption: {
          defaultText: 'Got it! Now text back a caption for your photo (think Instagram)! Keep it short & sweet, under 60 characters please.',
          fieldName: 'askCaptionMessage',
          fieldType: templateFieldTypes.text,
          name: 'askCaption',
        },
        invalidCaption: {
          defaultText: 'Sorry, I didn\'t get that. Text Q if you have a question.\n\nText back a caption for your photo -- keep it short & sweet, under 60 characters please. (but more than 3!)',
          fieldName: 'invalidCaptionMessage',
          fieldType: templateFieldTypes.text,
          name: 'invalidCaption',
        },
        askWhyParticipated: {
          fieldName: 'askWhyParticipatedMessage',
          fieldType: templateFieldTypes.text,
          name: 'askWhyParticipated',
        },
        invalidWhyParticipated: {
          fieldName: 'invalidWhyParticipatedMessage',
          fieldType: templateFieldTypes.text,
          name: 'askWhyParticipated',
        },
      },
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
      templates: {
        invalidText: {
          fieldName: 'invalidTextMessage',
          fieldType: templateFieldTypes.text,
          name: 'invalidText',
        },
        completedTextPost: {
          fieldName: 'completedTextPostMessage',
          fieldType: templateFieldTypes.text,
          name: 'completedTextPost',
        },
      },
    },
    textPostTransition: {
      type: 'textPostTransition',
      transitionable: true,
    },
    /**
     * Legacy types.
     *
     * Ideally we'd backfill all legacy entries as their new types, but we likely can't change the
     * the type of a Contentful entry without changing its id (if that's the case - we'd need to
     * bulk update all documents in the Conversations messages DB).
     *
     * The externalPostConfig has been deprecated by autoReply via its optional campaign field.
     */
    externalPostConfig: {
      type: 'externalPostConfig',
      templates: {
        autoReply: {
          fieldName: 'startExternalPostMessage',
          fieldType: templateFieldTypes.text,
          name: 'autoReply',
        },
      },
    },
    /**
     * We used one 'broadcast' type with a few fields to handle all types of broadcasts, but it'd be
     * tricky to configure. This has been deprecated by building out a new content type for each
     * broadcast type we send e.g. askSubscriptionStatus, askYesNo, autoReplyBroadcast, etc.
     */
    legacyBroadcast: {
      type: 'broadcast',
      broadcastable: true,
    },
  },
  templateFieldTypes,
};
