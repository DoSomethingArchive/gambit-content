[![wercker status](https://app.wercker.com/status/3e08a89169eeafef8ec020a9ceafe204/s/master "wercker status")](https://app.wercker.com/project/byKey/3e08a89169eeafef8ec020a9ceafe204) [![codecov](https://codecov.io/gh/DoSomething/gambit-campaigns/branch/master/graph/badge.svg)](https://codecov.io/gh/DoSomething/gambit-campaigns)

# Gambit Campaigns

Gambit Campaigns is a [Gambit Conversations](https://github.com/dosomething/gambit-conversations) microservice for:

* Storing User Campaign activity from an inbound message, and posting it to [Rogue](https://github.com/dosomething/gambit-campaigns/wiki/rogue).

* Querying Contentful for a list of active Keywords and Campaigns available running on Gambit.

* Querying [Phoenix Ashes](https://github.com/DoSomething/gambit-campaigns/wiki/Admin#available-variables) for Campaign data used in Gambit message templates.


Gambit Campaigns is built using [Express](http://expressjs.com/) and [MongoDB](https://www.mongodb.com).

### Installation

* Install Node, Mongo, and Redis
* Clone this repo, and create a `.env` file with required variables. See `.env.example`.
* Mongo should be running.
  * Run `mongo`.
  * If error, Run `sudo mongod`.
* Redis should be running.
  * Run `redis-cli ping`. You should get `PONG` as a response.
  * If error, make sure you have installed redis using `brew` and started the service.
* `npm install`
* `npm start`

## Development
* Contributions to this repo must adhere to the steps in wunder.io's Git workflow:  **[Wunderflow](http://wunderflow.wunder.io/)**.

* Run `npm all-tests` to lint code and run automated tests.


### License
&copy;2018 DoSomething.org. Gambit Campaigns is free software, and may be redistributed under the terms specified
in the [LICENSE](https://github.com/DoSomething/gambit-campaigns/blob/dev/LICENSE) file. The name and logo for
DoSomething.org are trademarks of Do Something, Inc and may not be used without permission.
