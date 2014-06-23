## routing-config.json
Here we configure the various routing scenarios we come across when interfacing
with Mobile Commons.

#### startCampaignTransitions
With this transition, the user is both opted into a path that will deliver the next message and also opted out of a campaign. This is usually done in cases where there are scheduled messages in a Mobile Commons campaign that we no longer want a user to receive after they respond to some message.

```
{
  ...
  'startCampaingTransitions': {
    'mData ID to trigger this transition': {
      '__comments': 'This is ignored.',
      'optin': opt in path ID with the next message user should receive,
      'optout': Mobile Commons campaign ID to remove user from
    }
  },
  ...
```

#### yesNoPaths
In cases where we prompt the user for a YES or NO response, we can use this to route the user to the next appropriate message. This is often needed when the experience delivered to the user is vastly different depending on their answer. For example, answering YES should start a 5 question quiz, but answering NO should just end the conversation flow there.

```
{
  ...
  'yesNoPaths': {
    '__comments': 'This is ignored.',
    'incomingPath': opt in path ID the user response is coming from,
    'yes': opt in path ID with the next message for user if answering YES,
    'no': opt in path ID with next message for user if answering NO
  },
  ...
}
```

----

## campaign-start-config.json
This file defines how responses to the campaign start multiple choice prompt
should be handled. The key for every object is the opt-in path for the
campaign start prompt. KNOW, PLAN, and DO fields are the mData IDs for those
respective sets of tips. PROVE, on the other hand, is the opt in path ID for
the start of the report back flow.

```
'campaign start opt in path': {
  '__comments': 'This is ignored.',
  'KNOW': KNOW mData ID,
  'PLAN': PLAN mData ID,
  'DO': DO mData ID,
  'PROVE': opt in path ID for the start of the report back
}
```
