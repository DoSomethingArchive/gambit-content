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
