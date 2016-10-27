# Signups

Post an existing Signup to upsert Gambit cache for given Signup, and send a signup confirmation message via chatbot to the Signup.user per Signup.source.

```
POST /v1/signups
```

**Headers**

Name | Type | Description
--- | --- | ---
`x-gambit-api-key` | `string` | **Required.** 
 
**Input**

Name | Type | Description
--- | --- | ---
`id` | `number` |  **Required.**  Signup ID to update Gambit cache for
`source` | `string` |  **Required.** Signup source -- if not equal to the `DS_API_POST_SOURCE` config var value, sends Signup confirmation message to User via chatbot

<details>
<summary>**Example Request**</summary>
````
curl -X "POST" "http://localhost:5000/v1/signups" \
     -H "x-gambit-api-key: totallysecret" \
     -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" \
     --data-urlencode "id=2309235" \
     --data-urlencode "source=slothbot-app-v0.2.1" \
````
</details>

<details>
<summary>**Example Response**</summary>
````
{
  "success": {
    "code": 200,
    "message":  "Hey, it's Puppet Sloth. Thanks for joining Aging Former YouTube Celebs! Text NEXTQUESTION to get started."
  }
}
````
</details>