# Campaigns

## Retrieve all Campaigns 

```
GET /v1/campaigns
```

Returns index of Gambit Campaign models stored in `campaigns` collection.

**Parameters**

Name | Type | Description
--- | --- | ---
`campaignbot` | `boolean` | If set to `true`, only return Campaigns defined in `CAMPAIGNBOT_CAMPAIGNS`

## Retrieve a Campaign

```
GET /v1/campaigns/:id
```

Returns a single Gambit Campaign model for given Campaign ID.

## Send a campaign message

```
POST /v1/campaigns/:id/message
```

Returns either an `error` or `success` object.

**Parameters**

Name | Type | Description
--- | --- | ---
`phone` | `string` | **Required.** Mobile number to send the campaign message.
`type`  | `string` | **Required.** The campaign message type.\
        |          | Supported types are: `scheduled_relative_to_signup_date`, `scheduled_relative_to_reportback_date`


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
