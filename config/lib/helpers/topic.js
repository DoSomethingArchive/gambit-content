'use strict';

const defaultText = {
  declined: 'Text Q if you have a question.',
  invalidInput: 'Sorry, I didn\'t get that.',
  yesNo: '\n\nYes or No',
};

const startCommand = '{{cmd_reportback}}';
const startPhotoPostText = `Thanks for signing up for {{title}}! Text ${startCommand} to submit a post.`;
const completeAnotherPhotoPostText = `To submit another post for {{title}}, text ${startCommand}`;
const photoPostDefaultText = {
  askWhyParticipated: 'Last question: Why was participating in {{title}} important to you? (No need to write an essay, one sentence is good).',
  completedPhotoPost: `Great! We've got you down for {{quantity}}. ${completeAnotherPhotoPostText}`,
  completedPhotoPostAutoReply: `${defaultText.invalidInput}\n\n${completeAnotherPhotoPostText}`,
  startPhotoPost: startPhotoPostText,
  startPhotoPostAutoReply: `${defaultText.invalidInput}\n\nText ${startCommand} when you're ready to submit a post for {{title}}.`,
  webStartPhotoPost: `Hi it's Freddie from DoSomething! ${startPhotoPostText}`,
};

module.exports = {
  allTopicsCacheKey: 'allTopics',
  defaultPostType: 'photo',
  /*
   * Maps each content type with a map of templateNames and its corresponding field name and
   * default text to use, if a field value doesn't exist. Fields without defaults are required.
   */
  templatesByContentType: {
    campaign: {
      campaignClosed: {
        fieldName: 'campaignClosedMessage',
        defaultText: 'Sorry, {{title}} is no longer available.\n\nText {{cmd_member_support}} for help.',
      },
      askContinue: {
        fieldName: 'askContinueMessage',
        defaultText: `Ready to get back to {{title}}?${defaultText.yesNo}`,
      },
      declinedContinue: {
        fieldName: 'declinedContinueMessage',
        defaultText: `Right on, we'll check in with you about {{title}} later.\n\n${defaultText.declined}`,
      },
      invalidAskContinueResponse: {
        fieldName: 'invalidContinueResponseMessage',
        defaultText: `${defaultText.invalidInput} Did you want to join {{title}}?${defaultText.yesNo}`,
      },
    },
    externalPostConfig: {
      startExternalPost: {
        fieldName: 'startExternalPostMessage',
      },
      webStartExternalPost: {
        fieldName: 'webStartExternalPostMessage',
      },
      startExternalPostAutoReply: {
        fieldName: 'startExternalPostAutoReplyMessage',
      },
    },
    photoPostConfig: {
      // These templates correspond to Contentful fields that need to be renamed + migrated.
      // @see https://github.com/DoSomething/gambit-campaigns/issues/1037
      startPhotoPost: {
        fieldName: 'gambitSignupMenuMessage',
        defaultText: photoPostDefaultText.startPhotoPost,
      },
      webStartPhotoPost: {
        fieldName: 'externalSignupMenuMessage',
        defaultText: photoPostDefaultText.webStartPhotoPost,
      },
      startPhotoPostAutoReply: {
        fieldName: 'invalidSignupMenuCommandMessage',
        defaultText: photoPostDefaultText.startPhotoPostAutoReply,
      },
      completedPhotoPost: {
        fieldName: 'completedMenuMessage',
        defaultText: photoPostDefaultText.completedPhotoPost,
      },
      completedPhotoPostAutoReply: {
        fieldName: 'invalidCompletedMenuCommandMessage',
        defaultText: photoPostDefaultText.completedPhotoPostAutoReply,
      },
      // End fields that renaming.
      askQuantity: {
        fieldName: 'askQuantityMessage',
      },
      invalidQuantity: {
        fieldName: 'invalidQuantityMessage',
      },
      askPhoto: {
        fieldName: 'askPhotoMessage',
      },
      invalidPhoto: {
        fieldName: 'invalidPhotoMessage',
      },
      askCaption: {
        fieldName: 'askCaptionMessage',
        defaultText: 'Got it! Now text back a caption for your photo (think Instagram)! Keep it short & sweet, under 60 characters please.',
      },
      invalidCaption: {
        fieldName: 'invalidCaptionMessage',
        defaultText: `${defaultText.invalidInput}\n\nText back a caption for your photo -- keep it short & sweet, under 60 characters please. (but more than 3!)`,
      },
      askWhyParticipated: {
        fieldName: 'askWhyParticipatedMessage',
        defaultText: photoPostDefaultText.askWhyParticipated,
      },
      invalidWhyParticipated: {
        fieldName: 'invalidWhyParticipatedMessage',
        defaultText: `${defaultText.invalidInput}\n\n${photoPostDefaultText.askWhyParticipated}`,
      },
    },
    textPostConfig: {
      askText: {
        fieldName: 'askTextMessage',
      },
      webAskText: {
        fieldName: 'webAskTextMessage',
      },
      invalidText: {
        fieldName: 'invalidTextMessage',
      },
      completedTextPost: {
        fieldName: 'completedTextPostMessage',
      },
    },
  },
};
