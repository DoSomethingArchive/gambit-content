'use strict';

module.exports = {
  contentTypes: {
    askChangeTopicBroadcast: {
      type: 'askChangeTopicBroadcast',
      templates: [
        'declinedChangeTopic',
        'invalidAskChangeTopicResponse',
        'autoReply',
      ],
    },
    autoReplyBroadcast: {
      type: 'autoReplyBroadcast',
      templates: [
        'autoReply',
      ],
    },
    legacy: {
      type: 'broadcast',
      templates: [],
    },
  },
};
