'use strict';

const defaultText = {
  declined: 'Text MENU if you\'d like to find a different action to take.',
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
  defaultPostType: 'photo',
  /**
   * Maps each content type that's available as a postConfig to the Post type it should create.
   *
   * { contentTypeName: 'postType' }
   */
  postTypesByContentType: {
    textPostConfig: 'text',
    photoPostConfig: 'photo',
  },
  /*
   * Maps each content type with a map of templateNames and its corresponding field name and
   * default text to use, if a field value doesn't exist. Fields without defaults are required.
   */
  templatesByContentType: {
    campaign: {
      memberSupport: {
        fieldName: 'memberSupportMessage',
        default: 'Text back your question and I\'ll try to get back to you within 24 hrs.\n\nIf you want to continue {{title}}, text back {{keyword}}',
      },
      campaignClosed: {
        fieldName: 'campaignClosedMessage',
        default: 'Sorry, {{title}} is no longer available.\n\nText {{cmd_member_support}} for help.',
      },
      askSignup: {
        fieldName: 'askSignupMessage',
        default: `{{tagline}}\n\nWant to join {{title}}?${defaultText.yesNo}`,
      },
      declinedSignup: {
        fieldName: 'declinedSignupMessage',
        default: `Ok! ${defaultText.declined}`,
      },
      invalidAskSignupResponse: {
        fieldName: 'invalidSignupResponseMessage',
        default: `${defaultText.invalidInput} Did you want to join {{title}}?${defaultText.yesNo}`,
      },
      askContinue: {
        fieldName: 'askContinueMessage',
        default: `Ready to get back to {{title}}?${defaultText.yesNo}`,
      },
      declinedContinue: {
        fieldName: 'declinedContinueMessage',
        default: `Right on, we'll check in with you about {{title}} later.\n\n${defaultText.declined}`,
      },
      invalidAskContinueResponse: {
        fieldName: 'invalidContinueResponseMessage',
        default: `${defaultText.invalidInput} Did you want to join {{title}}?${defaultText.yesNo}`,
      },
    },
    photoPostConfig: {
      // These are templates we want to rename, but renamed + migrated fields don't exist yet.
      gambitSignupMenu: {
        fieldName: 'gambitSignupMenuMessage',
        default: photoPostDefaultText.startPhotoPost,
      },
      externalSignupMenu: {
        fieldName: 'externalSignupMenuMessage',
        default: photoPostDefaultText.webStartPhotoPost,
      },
      invalidSignupMenuCommand: {
        fieldName: 'invalidSignupMenuCommandMessage',
        default: photoPostDefaultText.startPhotoPostAutoReply,
      },
      completedMenu: {
        fieldName: 'completedMenuMessage',
        default: photoPostDefaultText.completedPhotoPost,
      },
      invalidCompletedMenuCommand: {
        fieldName: 'invalidCompletedMenuCommandMessage',
        default: photoPostDefaultText.completedPhotoPostAutoReply,
      },
      // These are the renamed template names, but the fields still need to be renamed + migrated:
      startPhotoPost: {
        fieldName: 'gambitSignupMenuMessage',
        default: photoPostDefaultText.startPhotoPost,
      },
      webStartPhotoPost: {
        fieldName: 'externalSignupMenuMessage',
        default: photoPostDefaultText.webStartPhotoPost,
      },
      startPhotoPostAutoReply: {
        fieldName: 'invalidSignupMenuCommandMessage',
        default: photoPostDefaultText.startPhotoPostAutoReply,
      },
      completedPhotoPost: {
        fieldName: 'completedMenuMessage',
        default: photoPostDefaultText.completedPhotoPost,
      },
      completedPhotoPostAutoReply: {
        fieldName: 'invalidCompletedMenuCommandMessage',
        default: photoPostDefaultText.completedPhotoPostAutoReply,
      },
      // The name and fields of data collecting templates will stay the same:
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
        default: 'Got it! Now text back a caption for your photo (think Instagram)! Keep it short & sweet, under 60 characters please.',
      },
      invalidCaption: {
        fieldName: 'invalidCaptionMessage',
        default: `${defaultText.invalidInput}\n\nText back a caption for your photo -- keep it short & sweet, under 60 characters please. (but more than 3!)`,
      },
      askWhyParticipated: {
        fieldName: 'askWhyParticipatedMessage',
        default: photoPostDefaultText.askWhyParticipated,
      },
      invalidWhyParticipated: {
        fieldName: 'invalidWhyParticipatedMessage',
        default: `${defaultText.invalidInput}\n\n${photoPostDefaultText.askWhyParticipated}`,
      },
    },
    textPostConfig: {
      askText: {
        // TODO: Create new field and migrate.
        fieldName: 'botSignupConfirmedMessage',
      },
      webAskText: {
        // TODO: Create new field and migrate.
        fieldName: 'webSignupConfirmedMessage',
      },
      // This will be deprecated for webAskText once Conversations Signup messages checks post type.
      externalSignupMenu: {
        fieldName: 'botSignupConfirmedMessage',
      },
      invalidText: {
        fieldName: 'invalidTextMessage',
      },
      completedTextPost: {
        // TODO: Create new field and migrate.
        fieldName: 'textPostCompletedMessage',
      },
    },
  },
};
