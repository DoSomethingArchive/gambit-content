# Campaigns

## Retrieve all Campaigns 

```
GET /v1/campaigns
```

Returns index of Gambit Campaign models stored in `campaigns` collection.

**Parameters**

Name | Type | Description
--- | --- | ---
`start` | `boolean` | If set to `true`, only return Campaigns defined in `CAMPAIGNBOT_CAMPAIGNS`

## Retrieve a Campaign

```
GET /v1/campaigns/:id
```

Returns a single Gambit Campaign model for given Campaign ID.
