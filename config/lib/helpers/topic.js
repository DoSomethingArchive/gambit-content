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
};

module.exports = {
  defaultPostType: 'photo',
  /*
   * Maps each content type with a map of templateNames and its corresponding field name and
   * default text to use, if a field value doesn't exist. Fields without defaults are required.
   */
  templatesByContentType: {
    photoPostConfig: {
      // These templates correspond to Contentful fields that need to be renamed + migrated.
      // @see https://github.com/DoSomething/gambit-campaigns/issues/1037
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
      invalidText: {
        fieldName: 'invalidTextMessage',
      },
      completedTextPost: {
        fieldName: 'completedTextPostMessage',
      },
    },
    /**
     * The externalPostConfig type has been deprecated by the autoReply type, but we haven't
     * migrated these old entries to new autoReply entries (it's not possible to change an entry
     * type and keep its id. Leaving this here to support these legacy topics.
     */
    externalPostConfig: {
      startExternalPost: {
        fieldName: 'startExternalPostMessage',
      },
      startExternalPostAutoReply: {
        fieldName: 'startExternalPostAutoReplyMessage',
      },
    },
  },
};
