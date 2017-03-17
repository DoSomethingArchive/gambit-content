# Campaigns

## Retrieve Campaigns running on Gambit

```
GET /v1/campaigns
```

Returns index of Campaigns with published keywords.

<details>
<summary>**Example Request**</summary>
```
curl http://localhost:5000/v1/campaigns \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
```
</details>
<details>
<summary>**Example Response**</summary>
````
{
  "data": [
    {
      "id": "46",
      "title": "Don't Be a Sucker",
      "status": "closed",
      "keywords": [
        {
          "keyword": "SUCKERBOT"
        }
      ],
      "current_run": 7547,
      "mobilecommons_group_doing": 284005,
      "mobilecommons_group_completed": 284011
    },
    {
      "id": "2070",
      "title": "Bumble Bands",
      "status": "active",
      "keywords": [
        {
          "keyword": "BUMBLEBOT"
        },
        {
          "keyword": "BEESBOT"
        }
      ]
    },
    {
      "id": "3590",
      "title": "Shower Songs",
      "status": "active",
      "keywords": [
        {
          "keyword": "SHOWERBOT"
        }
      ]
    },
    {
      "id": "7483",
      "title": "Rinse, Recycle, Repeat",
      "status": "active",
      "keywords": [
        {
          "keyword": "RINSEBOT"
        }
      ]
    }
  ]
}
````
</details>

## Retrieve a Campaign

```
GET /v1/campaigns/:id
```

Returns a single Campaign, and its rendered Gambit messages in a `messages` object property.

The keys defined in the `messages` object correspond to fields on the Contentful Campaign content
type, e.g `askCaptionMessage`. Each field property contains an object with properties:

* `override` -- boolean specifying whether the `raw` value is defined on the entry for the
given Campaign ID, or the default Campaign
* `raw` -- string, the copy stored in Contentful to use for this message type
* `rendered` -- string, the rendered copy to be delivered to the end user

<details>
<summary>**Example Request**</summary>
```
curl http://localhost:5000/v1/campaigns/7483 \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
```
</details>
<details>
<summary>**Example Response**</summary>
```
{
  "data": {
    "id": "7483",
    "title": "Rinse, Recycle, Repeat",
    "status": "active",
    "messages": {
      "gambitSignupMenuMessage": {
        "override": true,
        "raw": "Great - it's simple: Keep beauty and personal care products out of landfills by making fun and creative recycling bins for the bathroom! \n\nThis action should take between 10 - 20 mins. Make it colorful so friends and family won't forget to recycle their bathroom empties. \n\nWhen you're done, text START to share a photo of your bin and you'll be entered to win a $5000 scholarship!",
        "rendered": "Great - it's simple: Keep beauty and personal care products out of landfills by making fun and creative recycling bins for the bathroom! \n\nThis action should take between 10 - 20 mins. Make it colorful so friends and family won't forget to recycle their bathroom empties. \n\nWhen you're done, text START to share a photo of your bin and you'll be entered to win a $5000 scholarship!"
      },
      "externalSignupMenuMessage": {
        "override": true,
        "raw": "Thanks for joining {{title}}!\n\nNearly half of Americans don’t regularly recycle their beauty and personal care products. That’s a major reason these items account for a significant amount of landfill waste.\n\nThe solution is simple: Make fun and creative bins for bathrooms.\n\nOnce you have created some bathroom recycling bins, take a pic to prove it! Then text {{cmd_reportback}} to share it with us!",
        "rendered": "Thanks for joining Rinse Recycle Repeat!\n\nNearly half of Americans don’t regularly recycle their beauty and personal care products. That’s a major reason these items account for a significant amount of landfill waste.\n\nThe solution is simple: Make fun and creative bins for bathrooms.\n\nOnce you have created some bathroom recycling bins, take a pic to prove it! Then text P to share it with us!"
      },
      "invalidSignupMenuCommandMessage": {
        "override": false,
        "raw": "Sorry, I didn't understand that.\n\nText {{cmd_reportback}} when you have {{rb_verb}} some {{rb_noun}}.\n\nIf you have a question, text {{cmd_member_support}}.",
        "rendered": "Sorry, I didn't understand that.\n\nText P when you have decorated some bins.\n\nIf you have a question, text Q."
      },
      "askQuantityMessage": {
        "override": false,
        "raw": "Sweet! First, what's the total number of {{rb_noun}} you {{rb_verb}}?\n\nSend the exact number back.",
        "rendered": "Sweet! First, what's the total number of bins you decorated?\n\nSend the exact number back."
      },
      "invalidQuantityMessage": {
        "override": false,
        "raw": "Sorry, that's not a valid number.\n\nWhat's the total number of {{rb_noun}} you have {{rb_verb}}?\n\nIf you have a question, text {{cmd_member_support}}.",
        "rendered": "Sorry, that's not a valid number.\n\nWhat's the total number of bins you have decorated?\n\nIf you have a question, text Q."
      },
      "askPhotoMessage": {
        "override": false,
        "raw": "Nice! Send your best pic of you and the {{quantity}} {{rb_noun}} you {{rb_verb}}.",
        "rendered": "Nice! Send your best pic of you and the {{quantity}} bins you decorated."
      },
      "invalidPhotoMessage": {
        "override": false,
        "raw": "Sorry, I didn't get that.\n\nSend a photo of the {{rb_noun}} you have {{rb_verb}}.\n\nIf you have a question, text {{cmd_member_support}} - I'll get back to you within 24 hours.",
        "rendered": "Sorry, I didn't get that.\n\nSend a photo of the bins you have decorated.\n\nIf you have a question, text Q - I'll get back to you within 24 hours."
      },
      "askCaptionMessage": {
        "override": false,
        "raw": "Got it! Now text back a caption for your photo (think Instagram)! Keep it short & sweet, under 60 characters please.",
        "rendered": "Got it! Now text back a caption for your photo (think Instagram)! Keep it short & sweet, under 60 characters please."
      },
      "askWhyParticipatedMessage": {
        "override": false,
        "raw": "Last question: Why was participating in {{title}} important to you? (No need to write an essay, one sentence is good).",
        "rendered": "Last question: Why was participating in Rinse, Recycle, Repeat important to you? (No need to write an essay, one sentence is good)."
      },
      "completedMenuMessage": {
        "override": false,
        "raw": "{{rb_confirmation_msg}}\n\nWe've got you down for {{quantity}} {{rb_noun}} {{rb_verb}}.\n\nHave you {{rb_verb}} more? Text {{cmd_reportback}}",
        "rendered": "Thanks for helping to keep #empties out of landfills! You'll receive an email shortly with a free shipping label so you can send your empties to TerraCycle be upcycled.\n\nWe've got you down for {{quantity}} bins decorated.\n\nHave you decorated more? Text P"
      },
      "invalidCompletedMenuCommandMessage": {
        "override": false,
        "raw": "Sorry, I didn't understand that.\n\nText {{cmd_reportback}} if you have {{rb_verb}} more {{rb_noun}}.\n\nIf you have a question, text {{cmd_member_support}}.",
        "rendered": "Sorry, I didn't understand that.\n\nText P if you have decorated more bins.\n\nIf you have a question, text Q."
      },
      "scheduledRelativeToSignupDateMessage": {
        "override": true,
        "raw": "Hey it's Freddie again! Have you had a chance to create a recycling bin?\n\nShare what you've done with other DoSomething members. Text back RINSE!",
        "rendered": "Hey it's Freddie again! Have you had a chance to create a recycling bin?\n\nShare what you've done with other DoSomething members. Text back RINSE!"
      },
      "scheduledRelativeToReportbackDateMessage": {
        "override": false,
        "rendered": ""
      },
      "memberSupportMessage": {
        "override": false,
        "raw": "Text back your question and I'll try to get back to you within 24 hrs.\n\nIf you want to continue {{title}}, text back {{keyword}}",
        "rendered": "Text back your question and I'll try to get back to you within 24 hrs.\n\nIf you want to continue Rinse, Recycle, Repeat, text back RINSEBOT"
      },
      "campaignClosedMessage": {
        "override": false,
        "raw": "Sorry, {{title}} is no longer available.\n\nText {{cmd_member_support}} for help.",
        "rendered": "Sorry, Rinse, Recycle, Repeat is no longer available.\n\nText Q for help."
      }
    },
    "keywords": [
      {
        "keyword": "RINSEBOT"
      }
    ]
  }
}
````
</details>

## Send a campaign message

```
POST /v1/campaigns/:id/message
```

Returns either an `error` or `success` object.

**Parameters**

Name | Type | Description
--- | --- | ---
`phone` | `string` | **Required.** Mobile number to send the campaign message.
`type`  | `string` | <div>**Required.** The campaign message type.</div><div>Supported types are: `scheduled_relative_to_signup_date`, `scheduled_relative_to_reportback_date`</div>


<details>
<summary>**Example Request**</summary>
```
curl http://localhost:5000/v1/campaigns/4944/message \
     -H "x-gambit-api-key: totallysecret" \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     -d '{"phone": "5555555511", "type": "scheduled_relative_to_signup_date"}'
```
</details>

<details>
<summary>**Example Response**</summary>
```
{"success":{"code":200,"message":"Sent text for 46 scheduled_relative_to_signup_date to 5555555511"}}
```
</details>
