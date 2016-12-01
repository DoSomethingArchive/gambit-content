# DonorsChooseBot

Currently only implemented for use by a Mobile Commons mData POST request.

```
POST /v1/donorschoosebot
```

**Headers**

Name | Type | Description
--- | --- | ---
`x-gambit-api-key` | `string` | **Required.**

**Parameters**

Name | Type | Description
--- | --- | ---
`start` | `boolean` | If set, DonorsChooseBot will initiate conversation and send first message to User.

**Input**

Field names are defined by the data included in a Mobile Commons mData POST request.

Name | Type | Description
--- | --- | ---
`phone` | `string` | **Required.** Mobile number that sent incoming message.
`args` | `string` | Incoming text sent.
`profile_id` | `number` | Mobile Commons Profile ID
`profile_first_name` | `string` | Mobile Commons Profile first name
`profile_email` | `string` | Mobile Commons Profile email
`profile_ss2016_donation_count` | `string` | Mobile Commons Custom Field to store number of donations. This parameter name can be changed via `DONORSCHOOSE_DONATION_FIELDNAME`

<details>
<summary>**Example Request**</summary>
````
curl -X "POST" "http://localhost:5000/v1/donorschoosebot?start=true" \
     -H "x-gambit-api-key: totallysecret" \
     -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" \
     --data-urlencode "phone=5555555511" \
     --data-urlencode "profile_id=136122001" \
````
</details>

<details>
<summary>**Example Response**</summary>
````
{
  "success": {
    "code": 200,
    "message": "First, text back your zip code to find a project near you to support."
  }
}

````
</details>
