# Topics

A topic is considered one of the following Contentful content types:

* `photoPostConfig` - creates a signup and submits a photo post for a campaign
* `textPostConfig` - creates a signup and submits a text post for a campaign
* `externalPostConfig` - creates a signup for a campaign, but does not submit a post. The campaign post is created externally when user visits the link included in the templates of an `externalPostConfig` topic.

Fields:

Name | Type | Description
-----|------|------------
`id` | String | The Contentful entry id
`type` | String | The Contentful content type, e.g. `photoPostConfig`
`postType` | String | The type of post the topic should create, e.g. `photo`
`campaign` | Object | The campaign this topic should create a signup and post for.
`templates` | Object | Collection of outbound message templates that can be sent from this topic.
`templates.raw` | String | The field value stored in Contentful to return for the template, or a hardcoded default value if the field value is not set
`templates.rendered` | String | The `raw` value replaced with any campaign or command tags. See https://github.com/DoSomething/gambit-admin/wiki/Tags
`templates.override` | Boolean | Whether the `raw` value is set from a Contentful field value (override is `true`), or from a hardcoded default (override is `false`)

## Retrieve all topics

```
GET /v1/topics
```

Returns a list of chatbot topics published in Contentful.


<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/topics \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
```

</p></details>

<details><summary>**Example Response**</summary><p>

```
{
  "data": [
    {
      "id": "5MSUDKlVp6kqkUMw8gW004",
      "type": "externalPostConfig",
      "postType": "external",
      "campaign": {
        "id": 7059,
        "title": "Lose Your V-Card",
        "tagline": "Help your friends register to vote!",
        "status": "active",
        "currentCampaignRun": {
          "id": 8128
        },
        "keywords": [
          "VCARD"
        ]
      },
      "templates": {
        "startExternalPost": {
          "raw": "One of the most impactful ways to create change in our communities and on issues we care about is by making our voices heard through voting. Your generation has the power to decide the next election. \n\nWhether you are old enough to vote or not -- you can make a difference. Tag a friend (who is 18 or older) on Facebook and give them an easy way to register to vote. By sharing this, you'll be entered to win a 2000 scholarship: https://www.dosomething.org/us/campaigns/lose-your-v-card/blocks/7UYxNKCmS4OqEOiKSSAE2?user_id={{user.id}}",
          "override": true,
          "rendered": "One of the most impactful ways to create change in our communities and on issues we care about is by making our voices heard through voting. Your generation has the power to decide the next election. \n\nWhether you are old enough to vote or not -- you can make a difference. Tag a friend (who is 18 or older) on Facebook and give them an easy way to register to vote. By sharing this, you'll be entered to win a 2000 scholarship: https://www.dosomething.org/us/campaigns/lose-your-v-card/blocks/7UYxNKCmS4OqEOiKSSAE2?user_id={{user.id}}"
        },
        "webStartExternalPost": {
          "raw": "Hi it's Freddie from DoSomething! Over 69 million young people are eligible to vote in 2018. Your generation has the power to decide this election. We need your help to spread the word!\n\nTag a friend (who is 18 or older) on Facebook and give them an easy way to register to vote. By sharing this, you'll be entered to win a 2000 scholarship: https://www.dosomething.org/us/campaigns/lose-your-v-card/blocks/7UYxNKCmS4OqEOiKSSAE2?user_id={{user.id}}",
          "override": true,
          "rendered": "Hi it's Freddie from DoSomething! Over 69 million young people are eligible to vote in 2018. Your generation has the power to decide this election. We need your help to spread the word!\n\nTag a friend (who is 18 or older) on Facebook and give them an easy way to register to vote. By sharing this, you'll be entered to win a 2000 scholarship: https://www.dosomething.org/us/campaigns/lose-your-v-card/blocks/7UYxNKCmS4OqEOiKSSAE2?user_id={{user.id}}"
        },
        "startExternalPostAutoReply": {
          "raw": "Whoops, I didn't understand that. To enter to win the $2000 scholarship, click here and tag a friend: https://www.dosomething.org/us/campaigns/lose-your-v-card/blocks/7UYxNKCmS4OqEOiKSSAE2?user_id={{user.id}}\n\nHave a question for me? Text QUESTION and I will respond within 24 hours.",
          "override": true,
          "rendered": "Whoops, I didn't understand that. To enter to win the $2000 scholarship, click here and tag a friend: https://www.dosomething.org/us/campaigns/lose-your-v-card/blocks/7UYxNKCmS4OqEOiKSSAE2?user_id={{user.id}}\n\nHave a question for me? Text QUESTION and I will respond within 24 hours."
        },
        "memberSupport": {
          "raw": "Text back your question and I'll try to get back to you within 24 hrs.\n\nIf you want to continue {{title}}, text back {{keyword}}",
          "override": false,
          "rendered": "Text back your question and I'll try to get back to you within 24 hrs.\n\nIf you want to continue Lose Your V-Card, text back VCARD"
        },
        "campaignClosed": {
          "raw": "Want to make your voice heard? Take 2 mins to make sure you’re registered to vote: {{{custom_url}}}\n\nThis year DoSomething.org is unleashing the power of young people to make change online, in their communities, and at all levels of govt. Stay tuned for updates on how you can get involved!",
          "override": true,
          "rendered": "Want to make your voice heard? Take 2 mins to make sure you’re registered to vote: {{{custom_url}}}\n\nThis year DoSomething.org is unleashing the power of young people to make change online, in their communities, and at all levels of govt. Stay tuned for updates on how you can get involved!"
        },
        "askSignup": {
          "raw": "{{tagline}}\n\nWant to join {{title}}?\n\nYes or No",
          "override": false,
          "rendered": "Help your friends register to vote!\n\nWant to join Lose Your V-Card?\n\nYes or No"
        },
        "declinedSignup": {
          "raw": "Okay, that's the last you'll hear from me today! But before I go, I wanted to give you one action you can do in under 2 mins (for the chance to win a scholarship). We're creating the largest crowd-sourced guide with tips to beat bullying. Want to share a tip? Text POWER now. ",
          "override": true,
          "rendered": "Okay, that's the last you'll hear from me today! But before I go, I wanted to give you one action you can do in under 2 mins (for the chance to win a scholarship). We're creating the largest crowd-sourced guide with tips to beat bullying. Want to share a tip? Text POWER now. "
        },
        "invalidAskSignupResponse": {
          "raw": "Sorry, I didn't get that. Did you want to join {{title}}?\n\nYes or No",
          "override": false,
          "rendered": "Sorry, I didn't get that. Did you want to join Lose Your V-Card?\n\nYes or No"
        },
        "askContinue": {
          "raw": "Ready to get back to {{title}}?\n\nYes or No",
          "override": false,
          "rendered": "Ready to get back to Lose Your V-Card?\n\nYes or No"
        },
        "declinedContinue": {
          "raw": "Right on, we'll check in with you about {{title}} later.\n\nText MENU if you'd like to find a different action to take.",
          "override": false,
          "rendered": "Right on, we'll check in with you about Lose Your V-Card later.\n\nText MENU if you'd like to find a different action to take."
        },
        "invalidAskContinueResponse": {
          "raw": "Sorry, I didn't get that. Did you want to join {{title}}?\n\nYes or No",
          "override": false,
          "rendered": "Sorry, I didn't get that. Did you want to join Lose Your V-Card?\n\nYes or No"
        }
      }
    },
    {
      "id": "3peS2Oye08o6OwUMAEcS2c",
      "type": "photoPostConfig",
      "postType": "photo",
      "campaign": {
        "id": 8038,
        "title": "#SaveTheMascots",
        "tagline": "Help us make every college campus tobacco-free.",
        "status": "closed",
        "currentCampaignRun": {
          "id": 8039
        },
        "keywords": [
          "MASCOT"
        ]
      },
      "templates": {
        "startPhotoPost": {
          "raw": "Secondhand smoke causes cancer, which is why thousands of colleges have gone tobacco-free. Problem is, 3,273 campuses still allow tobacco, which means secondhand smoke is harming everyone on campus including our beloved mascots. \n\nTell your college (or a college near you) to pledge to go tobacco-free by telling them to #SaveTheMascots by clicking here: http://bit.ly/2GE8APl\n\nTake a screenshot of the post you share, then text {{cmd_reportback}} to share it with us (and enter for a chance to win a $2500 scholarship)!",
          "override": true,
          "rendered": "Secondhand smoke causes cancer, which is why thousands of colleges have gone tobacco-free. Problem is, 3,273 campuses still allow tobacco, which means secondhand smoke is harming everyone on campus including our beloved mascots. \n\nTell your college (or a college near you) to pledge to go tobacco-free by telling them to #SaveTheMascots by clicking here: http://bit.ly/2GE8APl\n\nTake a screenshot of the post you share, then text START to share it with us (and enter for a chance to win a $2500 scholarship)!"
        },
        "webStartPhotoPost": {
          "raw": "Thanks for joining DoSomething.org's #SaveTheMascots! Ready to take a quick action (and enter for the chance to win a $2500 scholarship)? \n\nSecondhand smoke causes cancer, which is why thousands of colleges have gone tobacco-free. Problem is, 3,273 campuses still allow tobacco, which means secondhand smoke is harming everyone on campus including our beloved mascots. \n\nTell your college (or a college near you) to pledge to go tobacco-free by clicking here: http://bit.ly/2GE8APl\n\nTake a screenshot of the post you share, then text {{cmd_reportback}} to share it with us (and enter for the scholarship).",
          "override": true,
          "rendered": "Thanks for joining DoSomething.org's #SaveTheMascots! Ready to take a quick action (and enter for the chance to win a $2500 scholarship)? \n\nSecondhand smoke causes cancer, which is why thousands of colleges have gone tobacco-free. Problem is, 3,273 campuses still allow tobacco, which means secondhand smoke is harming everyone on campus including our beloved mascots. \n\nTell your college (or a college near you) to pledge to go tobacco-free by clicking here: http://bit.ly/2GE8APl\n\nTake a screenshot of the post you share, then text START to share it with us (and enter for the scholarship)."
        },
        "startPhotoPostAutoReply": {
          "raw": "Sorry, I didn't understand that. Text {{cmd_reportback}} when you have asked your college (or one near you) to go tobacco-free!\n\nIf you have a question, text Q.",
          "override": true,
          "rendered": "Sorry, I didn't understand that. Text START when you have asked your college (or one near you) to go tobacco-free!\n\nIf you have a question, text Q."
        },
        "completedPhotoPost": {
          "raw": "Thanks for urging the college or university to pledge to join the movement to have tobacco-free campuses! \n\nInterested in taking more actions and learning about other scholarship opportunities? Text MENU.",
          "override": true,
          "rendered": "Thanks for urging the college or university to pledge to join the movement to have tobacco-free campuses! \n\nInterested in taking more actions and learning about other scholarship opportunities? Text MENU."
        },
        "completedPhotoPostAutoReply": {
          "raw": "Sorry, I didn't understand that.\n\nText {{cmd_reportback}} if you have shared more posts urging colleges or universities to join the movement to have tobacco free campuses! \n\nIf you have a question, text Q.",
          "override": true,
          "rendered": "Sorry, I didn't understand that.\n\nText START if you have shared more posts urging colleges or universities to join the movement to have tobacco free campuses! \n\nIf you have a question, text Q."
        },
        "askQuantity": {
          "raw": "Sweet! First, what's the total number of posts you shared?\n\nBe sure to text in a number not a word (i.e. “4”, not “four”)",
          "override": true,
          "rendered": "Sweet! First, what's the total number of posts you shared?\n\nBe sure to text in a number not a word (i.e. “4”, not “four”)"
        },
        "invalidQuantity": {
          "raw": "Sorry, that's not a valid number.\n\nWhat's the total number of posts you have shared?\n\nIf you have a question, text Q.",
          "override": true,
          "rendered": "Sorry, that's not a valid number.\n\nWhat's the total number of posts you have shared?\n\nIf you have a question, text Q."
        },
        "askPhoto": {
          "raw": "Nice! Send back a screenshot of the tweet you posted asking your college (or one near you) to go tobacco-free.",
          "override": true,
          "rendered": "Nice! Send back a screenshot of the tweet you posted asking your college (or one near you) to go tobacco-free."
        },
        "invalidPhoto": {
          "raw": "Sorry, I didn't get that.\n\nSend a photo of the posts you have shared.\n\nIf you have a question, text Q - I'll get back to you within 24 hours.",
          "override": true,
          "rendered": "Sorry, I didn't get that.\n\nSend a photo of the posts you have shared.\n\nIf you have a question, text Q - I'll get back to you within 24 hours."
        },
        "askCaption": {
          "raw": "Got it! Now text back a caption for your photo (think Instagram)! Keep it short & sweet, under 60 characters please.",
          "override": false,
          "rendered": "Got it! Now text back a caption for your photo (think Instagram)! Keep it short & sweet, under 60 characters please."
        },
        "invalidCaption": {
          "raw": "Sorry, I didn't get that.\n\nText back a caption for your photo -- keep it short & sweet, under 60 characters please. (but more than 3!)",
          "override": false,
          "rendered": "Sorry, I didn't get that.\n\nText back a caption for your photo -- keep it short & sweet, under 60 characters please. (but more than 3!)"
        },
        "askWhyParticipated": {
          "raw": "Last question: Why was participating in {{title}} important to you? (No need to write an essay, one sentence is good).",
          "override": false,
          "rendered": "Last question: Why was participating in #SaveTheMascots important to you? (No need to write an essay, one sentence is good)."
        },
        "invalidWhyParticipated": {
          "raw": "Sorry, I didn't get that.\n\nLast question: Why was participating in {{title}} important to you? (No need to write an essay, one sentence is good).",
          "override": false,
          "rendered": "Sorry, I didn't get that.\n\nLast question: Why was participating in #SaveTheMascots important to you? (No need to write an essay, one sentence is good)."
        },
        "memberSupport": {
          "raw": "Text back your question and I'll try to get back to you within 24 hrs.\n\nIf you want to continue {{title}}, text back {{keyword}}",
          "override": false,
          "rendered": "Text back your question and I'll try to get back to you within 24 hrs.\n\nIf you want to continue #SaveTheMascots, text back MASCOT"
        },
        "campaignClosed": {
          "raw": "Sorry, {{title}} is no longer available.\n\nText {{cmd_member_support}} for help.",
          "override": false,
          "rendered": "Sorry, #SaveTheMascots is no longer available.\n\nText Q for help."
        },
        "askSignup": {
          "raw": "{{tagline}}\n\nWant to join {{title}}?\n\nYes or No",
          "override": false,
          "rendered": "Help us make every college campus tobacco-free.\n\nWant to join #SaveTheMascots?\n\nYes or No"
        },
        "declinedSignup": {
          "raw": "Ok! Text MENU if you'd like to find a different action to take.",
          "override": false,
          "rendered": "Ok! Text MENU if you'd like to find a different action to take."
        },
        "invalidAskSignupResponse": {
          "raw": "Sorry, I didn't get that. Did you want to join {{title}}?\n\nYes or No",
          "override": false,
          "rendered": "Sorry, I didn't get that. Did you want to join #SaveTheMascots?\n\nYes or No"
        },
        "askContinue": {
          "raw": "Ready to get back to {{title}}?\n\nYes or No",
          "override": false,
          "rendered": "Ready to get back to #SaveTheMascots?\n\nYes or No"
        },
        "declinedContinue": {
          "raw": "Right on, we'll check in with you about {{title}} later.\n\nText MENU if you'd like to find a different action to take.",
          "override": false,
          "rendered": "Right on, we'll check in with you about #SaveTheMascots later.\n\nText MENU if you'd like to find a different action to take."
        },
        "invalidAskContinueResponse": {
          "raw": "Sorry, I didn't get that. Did you want to join {{title}}?\n\nYes or No",
          "override": false,
          "rendered": "Sorry, I didn't get that. Did you want to join #SaveTheMascots?\n\nYes or No"
        }
      }
    },
  ]
}
```

</p></details>

## Retrieve a topic

```
GET /v1/topics/:id
```

Returns a single topic by its (Contentful) id.


<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/topics/6swLaA7HKE8AGI6iQuWk4y \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
```

</p></details>
<details><summary>**Example Response**</summary><p>

```
{
  "data": {
    "id": "6swLaA7HKE8AGI6iQuWk4y",
    "type": "photoPostConfig",
    "postType": "photo",
    "campaign": {
      "id": 7,
      "title": "Mirror Messages",
      "tagline": "Boost a stranger's self-esteem with just a sticky note!",
      "status": "active",
      "currentCampaignRun": {
        "id": 8076
      },
      "keywords": [
        "MIRROR"
      ]
    },
    "templates": {
      "startPhotoPost": {
        "raw": "Over 111,000 people have joined the movement to bring positivity to their schools. All it takes is posting encouraging notes in places that can trigger low self-esteem. Take 5 mins to post a note today. \n\nThen, text {{cmd_reportback}} to share a photo of the messages you posted (and you'll be entered to win a $2000 scholarship)!",
        "override": true,
        "rendered": "Over 111,000 people have joined the movement to bring positivity to their schools. All it takes is posting encouraging notes in places that can trigger low self-esteem. Take 5 mins to post a note today. \n\nThen, text START to share a photo of the messages you posted (and you'll be entered to win a $2000 scholarship)!"
      },
      "webStartPhotoPost": {
        "raw": "Hey - this is Freddie from DoSomething. Thanks for joining a movement to spread positivity in school. You can do something simple to make a big impact for a stranger.\n\nLet's do this: post encouraging notes in places that can trigger low self-esteem, like school bathrooms.\n\nThen, text  {{cmd_reportback}}  to share a photo of the messages you posted (and you'll be entered to win a $2000 scholarship)!",
        "override": true,
        "rendered": "Hey - this is Freddie from DoSomething. Thanks for joining a movement to spread positivity in school. You can do something simple to make a big impact for a stranger.\n\nLet's do this: post encouraging notes in places that can trigger low self-esteem, like school bathrooms.\n\nThen, text  START  to share a photo of the messages you posted (and you'll be entered to win a $2000 scholarship)!"
      },
      "startPhotoPostAutoReply": {
        "raw": "Sorry, I didn't get that.\n\nText {{cmd_reportback}} when you're ready to submit a post for {{title}}.",
        "override": false,
        "rendered": "Sorry, I didn't get that.\n\nText START when you're ready to submit a post for Mirror Messages."
      },
      "completedPhotoPost": {
        "raw": "Great! We've got you down for {{quantity}} messages posted.\n\nTo submit another post for Mirror Messages, text {{cmd_reportback}}.",
        "override": true,
        "rendered": "Great! We've got you down for {{quantity}} messages posted.\n\nTo submit another post for Mirror Messages, text START."
      },
      "completedPhotoPostAutoReply": {
        "raw": "Sorry I didn't get that.  If you've posted more messages, text {{cmd_reportback}}.\n\nText Q if you have a question, or text MENU to find a different action to take.",
        "override": true,
        "rendered": "Sorry I didn't get that.  If you've posted more messages, text START.\n\nText Q if you have a question, or text MENU to find a different action to take."
      },
      "askQuantity": {
        "raw": "Sweet! First, what's the total number of messages you posted?\n\nBe sure to text in a number not a word (i.e. “4”, not “four”)",
        "override": true,
        "rendered": "Sweet! First, what's the total number of messages you posted?\n\nBe sure to text in a number not a word (i.e. “4”, not “four”)"
      },
      "invalidQuantity": {
        "raw": "Sorry, that isn't a valid number. What's the total number of messages you posted? Be sure to text in a number not a word (i.e. “4”, not “four”)",
        "override": true,
        "rendered": "Sorry, that isn't a valid number. What's the total number of messages you posted? Be sure to text in a number not a word (i.e. “4”, not “four”)"
      },
      "askPhoto": {
        "raw": "Send us your best pic of yourself and the messages you posted.",
        "override": true,
        "rendered": "Send us your best pic of yourself and the messages you posted."
      },
      "invalidPhoto": {
        "raw": "Sorry, I didn't get that.\n\nSend us your best pic of yourself and the messages you posted. \n\nIf you have a question, text Q.",
        "override": true,
        "rendered": "Sorry, I didn't get that.\n\nSend us your best pic of yourself and the messages you posted. \n\nIf you have a question, text Q."
      },
      "askCaption": {
        "raw": "Got it! Now text back a caption for your photo (think Instagram)! Keep it short & sweet, under 60 characters please.",
        "override": false,
        "rendered": "Got it! Now text back a caption for your photo (think Instagram)! Keep it short & sweet, under 60 characters please."
      },
      "invalidCaption": {
        "raw": "Sorry, I didn't get that.\n\nText back a caption for your photo -- keep it short & sweet, under 60 characters please. (but more than 3!)",
        "override": false,
        "rendered": "Sorry, I didn't get that.\n\nText back a caption for your photo -- keep it short & sweet, under 60 characters please. (but more than 3!)"
      },
      "askWhyParticipated": {
        "raw": "Last question: Why was participating in {{title}} important to you? (No need to write an essay, one sentence is good).",
        "override": false,
        "rendered": "Last question: Why was participating in Mirror Messages important to you? (No need to write an essay, one sentence is good)."
      },
      "invalidWhyParticipated": {
        "raw": "Sorry, I didn't get that.\n\nLast question: Why was participating in {{title}} important to you? (No need to write an essay, one sentence is good).",
        "override": false,
        "rendered": "Sorry, I didn't get that.\n\nLast question: Why was participating in Mirror Messages important to you? (No need to write an essay, one sentence is good)."
      },
      "memberSupport": {
        "raw": "Text back your question and I'll try to get back to you within 24 hrs.\n\nIf you want to continue {{title}}, text back {{keyword}}",
        "override": false,
        "rendered": "Text back your question and I'll try to get back to you within 24 hrs.\n\nIf you want to continue Mirror Messages, text back MIRROR"
      },
      "campaignClosed": {
        "raw": "Sorry, {{title}} is no longer available.\n\nText {{cmd_member_support}} for help.",
        "override": false,
        "rendered": "Sorry, Mirror Messages is no longer available.\n\nText Q for help."
      },
      "askSignup": {
        "raw": "{{tagline}}\n\nWant to join {{title}}?\n\nYes or No",
        "override": false,
        "rendered": "Boost a stranger's self-esteem with just a sticky note!\n\nWant to join Mirror Messages?\n\nYes or No"
      },
      "declinedSignup": {
        "raw": "Ok! Text MENU if you'd like to find a different action to take.",
        "override": false,
        "rendered": "Ok! Text MENU if you'd like to find a different action to take."
      },
      "invalidAskSignupResponse": {
        "raw": "Sorry, I didn't get that. Did you want to join {{title}}?\n\nYes or No",
        "override": false,
        "rendered": "Sorry, I didn't get that. Did you want to join Mirror Messages?\n\nYes or No"
      },
      "askContinue": {
        "raw": "Ready to get back to {{title}}?\n\nYes or No",
        "override": false,
        "rendered": "Ready to get back to Mirror Messages?\n\nYes or No"
      },
      "declinedContinue": {
        "raw": "Right on, we'll check in with you about {{title}} later.\n\nText MENU if you'd like to find a different action to take.",
        "override": false,
        "rendered": "Right on, we'll check in with you about Mirror Messages later.\n\nText MENU if you'd like to find a different action to take."
      },
      "invalidAskContinueResponse": {
        "raw": "Sorry, I didn't get that. Did you want to join {{title}}?\n\nYes or No",
        "override": false,
        "rendered": "Sorry, I didn't get that. Did you want to join Mirror Messages?\n\nYes or No"
      }
    }
  }
}
```

</p></details>
