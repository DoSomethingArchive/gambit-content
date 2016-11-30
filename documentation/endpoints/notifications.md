# Notifications

## Post relative reminder

```
POST /v1/notifications/reminder
```

Returns either an `error` or `success` object.

**Parameters**

Name | Type | Description
--- | --- | ---
`northstarUserId` | `string` | Northstar User Id to send notification for.
`campaignId` | `string|int` | The campaign ID this notification is for.
`reminderType` | `string` | The reminder type. This can be `signup` or `reportback`.
