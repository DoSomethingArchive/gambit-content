# Topics

A conversation topic may be set to one of the following Contentful content types:

### Campaign topics

* `photoPostConfig` - creates a signup and sends replies to create a photo post for a campaign
* `textPostConfig` - creates a signup and sends replies to create text post for a campaign
* `externalPostConfig` - creates a signup for a campaign, but does not create a post via messaging. The campaign post is created externally when user visits the link included in the templates of an `externalPostConfig` topic.

Under construction

* `autoReply` - repeats a single `autoReply` template, creates a signup if campaign is set. This will deprecate the `externalPostConfig` type.
* `askYesNo` - asks yes/no question (and can be sent as a [broadcast](./topics.md))

Fields:

Name | Type | Description
-----|------|------------
`id` | String | The Contentful entry id
`type` | String | The Contentful entry type, e.g. `photoPostConfig`, `textPostConfig`
`postType` | String | The type of post the topic should create, e.g. `photo`
`campaign` | Object | The campaign this topic should create a signup and post for.
`templates` | Object | Collection of outbound message templates that can be sent from this topic.
`templates.raw` | String | The field value stored in Contentful to return for the template, or a hardcoded default value if the field value is not set
`templates.text` | String | The `raw` value replaced with any campaign or command tags. See https://github.com/DoSomething/gambit-admin/wiki/Tags
`templates.override` | Boolean | Whether the `raw` value is set from a Contentful field value (override is `true`), or from a hardcoded default (override is `false`)
`templates.topic` | Object | If an id is present, this reply template should update the conversation topic accordingly.
`triggers` | Array | List of defaultTopicTriggers that change user conversation to this topic

## Retrieve topics

```
GET /v1/topics
```

Returns topics.

### Query parameters

Name | Type | Description
-----|------|------------
`limit` | Number | Number of results to retrieve
`skip` | Number | Number of results to skip


<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/topics?skip=5
  -H "Accept: application/json"
  -H "Content-Type: application/json"
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
        ...
      },
      "triggers": [
        "vcard",
      ]
    },
      {
      "id": "2X4r3fZrTGA2mGemowgiEI",
      "name": "askYesNo test",
      "type": "askYesNo",
      "createdAt": "2018-08-06T23:34:56.395Z",
      "updatedAt": "2018-08-08T22:20:14.822Z",
      "message": {
        "text": "Join Pump it Up? \n\nYes No",
        "attachments": [],
        "template": "askYesNo",
        "topic": {}
      },
      "templates": {
        "saidYes": {
          "text": "Great! Text START to submit a photo.",
          "topic": {
            "id": "4xXe9sQqmIeiWauSUu6kAY",
            "name": "Pump It Up - Submit Flyer",
            "type": "photoPostConfig",
            "createdAt": "2018-08-01T14:41:30.242Z",
            "updatedAt": "2018-08-07T15:44:59.609Z"
          }
        },
        "saidNo": {
          "text": "Ok, we'll check in with you later.",
          "topic": {}
        },
        "invalidAskYesNoResponse": {
          "text": "Sorry, I didn't get that - did you want to join for Pump It Up? Yes or No",
          "topic": {}
        },
        "autoReply": {
          "text": "Sorry, I didn't understand that. Text Q if you have a question.",
          "topic": {}
        }
      },
      "triggers": [
        
      ]
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
        ...
      },
      "triggers": [
        "mascot",
      ]
    },
    ...
  ],
  "meta": {
    "pagination": {
      "total": 21,
      "skip": 5,
      "limit": 100
    }
  }
}
```

</p></details>

## Retrieve topic

```
GET /v1/topics/:id
```

Returns a topic.

### Query parameters

Name | Type | Description
-----|------|------------
`cache` | string | If set to `false`, fetches topic from Contentful and resets cache.


<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/topics/6swLaA7HKE8AGI6iQuWk4y?cache=false \
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
      ...
      "invalidAskContinueResponse": {
        "raw": "Sorry, I didn't get that. Did you want to join {{title}}?\n\nYes or No",
        "override": false,
        "rendered": "Sorry, I didn't get that. Did you want to join Mirror Messages?\n\nYes or No"
      }
    },
    "triggers": [
      "mirror",
    ]
  }
}
```

</p></details>
