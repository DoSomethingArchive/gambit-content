# Campaigns

The `campaigns` resource lists active topics for [campaigns](https://github.com/DoSomething/phoenix-next/blob/master/docs/api-reference/v2/campaigns.md#retrieve-a-campaign).  Users can participate in a campaign via chatbot if the campaign has at least one active topic, meaning the topic has at least one published defaultTopicTrigger referencing it.


Fields:

Name | Type | Description
-----|------|------------
`id` | Number | The campaign id
`title` | String | The campaign title, available as a `{{title}}` tag within a topic template
`tagline` | String | The campaign tagline, available as a `{{tagline}}` tag within a topic template
`status` | String | Either `'active'` or `'closed'`. Users may not participate in chatbot topics for closed campaigns.
`currentCampaignRun` | Object | Contains a numeric `id` property to be passed when creating a post for the campaign
`topics` | Array | List of active [topics](/topics.md) available for the campaign.


## Retrieve all campaigns

```
GET /v1/campaigns
```

Returns a list of campaigns that active topics.

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/campaigns \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
```

</p></details>

<details><summary>**Example Response**</summary><p>

```
{
  "data": [
    {
      "id": 7,
      "title": "Mirror Messages",
      "tagline": "Boost a stranger's self-esteem with just a sticky note!",
      "status": "active",
      "currentCampaignRun": {
        "id": 8076
      },
      "topics": [
        {
          "id": "6swLaA7HKE8AGI6iQuWk4y",
          "name": "Mirror Messages",
          "postType": "photo",
          "triggers": [
            "mirror"
          ]
        }
      ]
    },
    {
      "id": 2178,
      "title": "Give a Spit About Cancer",
      "tagline": "Fight blood cancer just by swabbing your cheek.",
      "status": "closed",
      "currentCampaignRun": {
        "id": 8044
      },
      "topics": [
        {
          "id": "tv7e98JGXmMM2kskGaUA2",
          "name": "Give A Spit - Share link",
          "postType": "external",
          "triggers": [
            "spit"
          ]
        }
      ]
    },
  ]
}
```

</p></details>

## Retrieve a campaign

```
GET /v1/campaigns/:id
```

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/campaigns/7 \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
```

</p></details>
<details><summary>**Example Response**</summary><p>

```
{
  "data": {
    "id": 7,
    "title": "Mirror Messages",
    "tagline": "Boost a stranger's self-esteem with just a sticky note!",
    "status": "active",
    "currentCampaignRun": {
      "id": 8076
    },
    "topics": [
      {
        "id": "6swLaA7HKE8AGI6iQuWk4y",
        "type": "photoPostConfig",
        "postType": "photo",
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
            "raw": "Text back your question and I'll try to get back to you within 24 hrs.",
            "override": false,
            "rendered": "Text back your question and I'll try to get back to you within 24 hrs."
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
    ],
    "botConfig": {
      "postType": "photo",
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
}
```

</p></details>
