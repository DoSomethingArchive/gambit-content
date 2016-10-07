# Gambit

This is __Gambit__, a DoSomething.org chatbot API for use with Mobile Commons.


## Endpoints

#### Chatbot
Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`POST /v1/chatbot` | [Chat](endpoints/chatbot.md#chat)


#### DS Campaigns

> :memo: We're looking to deprecate these, so don't get too attached!

Endpoint                                       | Functionality                                           
---------------------------------------------- | --------------------------------------------------------
`POST /ds-routing/campaign-transition` | [Mobile Commons campaign transition](https://github.com/DoSomething/gambit/wiki/API#moco-campaign-transition)
`POST /ds-routing/yes-no-gateway` | [Submit yes or no](https://github.com/DoSomething/gambit/wiki/API#yes-no)
`POST /reportback/:campaignName` | [Reportback chat](https://github.com/DoSomething/gambit/wiki/API#reportback)
