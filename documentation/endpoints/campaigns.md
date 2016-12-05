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
