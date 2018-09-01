# Contentful entries

Contentful entries used for chatbot content.

Fields:

Name | Type | Description
-----|------|------------
`raw` | Object | The response from a Contentful API query for an entry. This data can be used to pass query string parameters to proxy to the Contentful API. 
`parsed` | Object | The parsed raw property, if entry type is used in a `GET /broadcasts`, `GET /defaultTopicTriggers`, or `GET /topics` request. This property is set to `null` otherwise (e.g.  `campaign`, `webSignup` types).


## Retrieve Contentful entries

```
GET /v1/contentfulEntries
```

Returns Contentful entries.

### Query parameters

Proxies the Contentful API.

@see https://www.contentful.com/developers/docs/references/content-delivery-api for querying by fields.

Name | Type | Description
-----|------|------------
`content_type` | String | Required -- the type of entry to query for. When querying by fields, Contentful requires a single `content_type` value. 

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/contentfulEntries?&content_type=campaign&fields.webSignup[exists]=true
  -H "x-gambit-api-key: totallysecret"
  -H "Accept: application/json"
  -H "Content-Type: application/json"
```

</p></details>

<details><summary>**Example Response**</summary><p>

```
{
  "data": [
    {
      "raw": {
        "sys": {
          "space": {
            "sys": {
              "type": "Link",
              "linkType": "Space",
              "id": "owik07lyerdj"
            }
          },
          "type": "Entry",
          "id": "68Oy1FcaR2EiaMieicaoom",
          "contentType": {
            "sys": {
              "type": "Link",
              "linkType": "ContentType",
              "id": "campaign"
            }
          },
          ...
          "locale": "en-US"
        },
        "fields": {
          "campaignId": "2299",
          "webSignup": {
            "sys": {
              "space": {
                "sys": {
                  "type": "Link",
                  "linkType": "Space",
                  "id": "owik07lyerdj"
                }
              },
              "type": "Entry",
              "id": "1IFUHnCS0QmYMiscKC2qMO",
              "contentType": {
                "sys": {
                  "type": "Link",
                  "linkType": "ContentType",
                  "id": "webSignup"
                }
              },
              ...
            },
            "fields": {
              "text": "Thanks for signing up for Two Books Blue Books!",
              "topic": {
                "sys": {
                  "type": "Link",
                  "linkType": "Entry",
                  "id": "2Wzzquygx2wwMWe8kQAMgc"
                }
              }
            }
          },
        }
      },
      "parsed": null
    }
  ],
  "meta": {
    "pagination": {
      "total": 1,
      "skip": 0,
      "limit": 100
    }
  }
}

```
</p></details>


## Retrieve Contentful entry

```
GET /v1/contentfulEntries/:id
```

Returns a Contentful entry.

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/contentfulEntries/5IZR2IQlJSw6UOaiwQgkWm
  -H "x-gambit-api-key: totallysecret"
  -H "Accept: application/json"
  -H "Content-Type: application/json"
```

</p></details>

<details><summary>**Example Response**</summary><p>
  
```
// 20180831170241
// http://localhost:5000/v1/contentfulEntries/5IZR2IQlJSw6UOaiwQgkWm?apiKey=totallysecret&content_type=campaign&fields.webSignup[exists]=true

{
  "data": {
    "raw": {
      "sys": {
        "type": "Entry",
        "id": "5IZR2IQlJSw6UOaiwQgkWm",
        ...
      },
      "fields": {
        "name": "PollLocationFinder2018_Sept4_MA",
        "text": "Hi it's Freddie again! It's finally here! Today is Primary Election Day in Massachusetts. Are you (or your friends and family) going to vote today? Yes or No?",
        "saidYes": "That's amazing! Your voice matters and we want to celebrate you for voting today. Take a photo of you and your I voted sticker (or make a sign that says I'm A Voter). Text START to share your photo with us.\n\nNeed to know where your polling place is? Find yours here: https://www.dosomething.org/us/campaigns/i-found-my-v-spot-2018/blocks/5slmqL2Xkcm0C60iyMwoa8?source=sms&utm_source=dosomething&utm_medium=sms&utm_campaign=sms_polllocator0904&user_id={{user.id}}&broadcastid=5IZR2IQlJSw6UOaiwQgkWm",
        "saidYesTopic": {
          "sys": {
            "space": {
              "sys": {
                "type": "Link",
                "linkType": "Space",
                "id": "owik07lyerdj"
              }
            },
            "type": "Entry",
            "id": "1yuEra7KjSwMwyO66UO2wE",
            ...
          },
          "fields": {
            "name": "Poll Location Finder - I Voted Sticker",
            "campaign": {
              "sys": {
                "type": "Link",
                "linkType": "Entry",
                "id": "3ZegOE2FVuW4oKq2GuKi04"
              }
            },
            ...
          }
        },
        "saidNo": "Even if you're not voting today, there's still an important election in November. Your voice matters, and it only takes 2 mins to register. Become a voter: https://vote.dosomething.org/?r=user:{{user.id}},campaignID:8017,campaignRunID:8022,source:sms,source_details:broadcastID_5IZR2IQlJSw6UOaiwQgkWm\n\nNot eligible to vote? You can still make an impact. Run an online voter reg drive to get your friends and family to the polls: https://www.dosomething.org/us/campaigns/online-registration-drive/blocks/4wXK2RiFo4KyKgOWssS0Og?source=sms&utm_source=dosomething&utm_medium=sms&utm_campaign=sms_voterreg0904&user_id={{user.id}}&broadcastid=5IZR2IQlJSw6UOaiwQgkWm",
        "saidNoTopic": {
          "sys": {
            "space": {
              "sys": {
                "type": "Link",
                "linkType": "Space",
                "id": "owik07lyerdj"
              }
            },
            "type": "Entry",
            "id": "61RPZx8atiGyeoeaqsckOE",
            ...
          },
          "fields": {
            "name": "Generic autoReply",
            "autoReply": "Sorry, I didn't understand that. Text Q if you have a question."
          }
        },
        "invalidAskYesNoResponse": "Sorry, I didn't get that - are you going to the polls today? Yes or No"
      }
    },
    "parsed": {
      "id": "5IZR2IQlJSw6UOaiwQgkWm",
      "name": "PollLocationFinder2018_Sept4_MA",
      "type": "askYesNo",
      "createdAt": "2018-08-31T14:57:56.844Z",
      "updatedAt": "2018-08-31T15:00:49.219Z",
      "message": {
        "text": "Hi it's Freddie again! It's finally here! Today is Primary Election Day in Massachusetts. Are you (or your friends and family) going to vote today? Yes or No?",
        "attachments": [],
        "template": "askYesNo",
        "topic": {}
      },
      "templates": {
        "saidYes": {
          "text": "That's amazing! Your voice matters and we want to celebrate you for voting today. Take a photo of you and your I voted sticker (or make a sign that says I'm A Voter). Text START to share your photo with us.\n\nNeed to know where your polling place is? Find yours here: https://www.dosomething.org/us/campaigns/i-found-my-v-spot-2018/blocks/5slmqL2Xkcm0C60iyMwoa8?source=sms&utm_source=dosomething&utm_medium=sms&utm_campaign=sms_polllocator0904&user_id={{user.id}}&broadcastid=5IZR2IQlJSw6UOaiwQgkWm",
          "topic": {
            "id": "1yuEra7KjSwMwyO66UO2wE",
            "name": "Poll Location Finder - I Voted Sticker",
            "type": "photoPostConfig",
            "createdAt": "2018-08-27T22:06:33.787Z",
            "updatedAt": "2018-08-28T00:59:24.089Z",
            "postType": "photo",
            "campaign": {
              "id": 7314,
              "title": "I Found My V-Spot",
              "tagline": "Find your polling place and send us photos of you voting.",
              "status": "active",
              "currentCampaignRun": {
                "id": 8188
              },
              "endDate": null
            },
            "templates": {...},
          },
        },
        "saidNo": {...}
      }
    }
  }
}
```

</p></details>
