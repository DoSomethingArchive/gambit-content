# Topics


## Retrieve a topic

```
GET /v1/topics/:id
```

Returns a single topic, and its rendered templates for Gambit Conversations usage.

A topic's `templates` properties are rendered from the field values of its Contentful entry. Each `templates` property is an object with properties:

* `override` -- boolean specifying whether the `raw` value is defined on the entry for the
given Campaign ID, or the default Campaign
* `raw` -- string, the copy stored in Contentful to use for this message type
* `rendered` -- string, the rendered copy to be delivered to the end user

<details><summary>**Example Request**</summary><p>

```
curl http://localhost:5000/v1/topics/5MSUDKlVp6kqkUMw8gW004 \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
```

</p></details>
<details><summary>**Example Response**</summary><p>

```
{
  "data": {
    "id": "5MSUDKlVp6kqkUMw8gW004",
    "type": "externalPostConfig",
    "campaign": {
      "id": 7059,
      "title": "Lose Your V-Card",
      "tagline": "Help your friends register to vote!"
    },
    "templates": {
      "startExternalPost": {
        "raw": "Hi it's Freddie from DoSomething! Over 69 million young people are eligible to vote in 2018. Your generation has the power to decide this election. We need your help to spread the word!\n\nTag a friend (who is 18 or older) on Facebook and give them an easy way to register to vote. By sharing this, you'll be entered to win a $2000 scholarship: https://www.dosomething.org/us/campaigns/lose-your-v-card/blocks/7UYxNKCmS4OqEOiKSSAE2?user_id={{user.id}}",
        "override": true,
        "rendered": "Hi it's Freddie from DoSomething! Over 69 million young people are eligible to vote in 2018. Your generation has the power to decide this election. We need your help to spread the word!\n\nTag a friend (who is 18 or older) on Facebook and give them an easy way to register to vote. By sharing this, you'll be entered to win a $2000 scholarship: https://www.dosomething.org/us/campaigns/lose-your-v-card/blocks/7UYxNKCmS4OqEOiKSSAE2?user_id={{user.id}}"
      },
      "webStartExternalPost": {
        "raw": "Hi it's Freddie from DoSomething! Over 69 million young people are eligible to vote in 2018. Your generation has the power to decide this election. We need your help to spread the word!\n\nTag a friend (who is 18 or older) on Facebook and give them an easy way to register to vote. By sharing this, you'll be entered to win a $2000 scholarship: https://www.dosomething.org/us/campaigns/lose-your-v-card/blocks/7UYxNKCmS4OqEOiKSSAE2?user_id={{user.id}}",
        "override": true,
        "rendered": "Hi it's Freddie from DoSomething! Over 69 million young people are eligible to vote in 2018. Your generation has the power to decide this election. We need your help to spread the word!\n\nTag a friend (who is 18 or older) on Facebook and give them an easy way to register to vote. By sharing this, you'll be entered to win a $2000 scholarship: https://www.dosomething.org/us/campaigns/lose-your-v-card/blocks/7UYxNKCmS4OqEOiKSSAE2?user_id={{user.id}}"
      },
      "startExternalPostAutoReply": {
        "raw": "Whoops, I didn't understand that. To enter to win the $2000 scholarship, click here and tag a friend: https://www.dosomething.org/us/campaigns/lose-your-v-card/blocks/7UYxNKCmS4OqEOiKSSAE2?user_id={{user.id}}\n\nHave a question for me? Text QUESTION and I will respond within 24 hours.",
        "override": true,
        "rendered": "Whoops, I didn't understand that. To enter to win the $2000 scholarship, click here and tag a friend: https://www.dosomething.org/us/campaigns/lose-your-v-card/blocks/7UYxNKCmS4OqEOiKSSAE2?user_id={{user.id}}\n\nHave a question for me? Text QUESTION and I will respond within 24 hours."
      },
      "memberSupport": {
        "raw": "Text back your question and I'll try to get back to you within 24 hrs.\n\nIf you want to continue {{title}}, text back {{keyword}}",
        "override": false,
        "rendered": "Text back your question and I'll try to get back to you within 24 hrs.\n\nIf you want to continue Lose Your V-Card, text back {{keyword}}"
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
        "raw": "Ok! Text MENU if you'd like to find a different action to take.",
        "override": false,
        "rendered": "Ok! Text MENU if you'd like to find a different action to take."
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
  }}
```

</p></details>
