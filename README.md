[![wercker status](https://app.wercker.com/status/3e08a89169eeafef8ec020a9ceafe204/s/master "wercker status")](https://app.wercker.com/project/byKey/3e08a89169eeafef8ec020a9ceafe204) [![codecov](https://codecov.io/gh/DoSomething/gambit/branch/develop/graph/badge.svg)](https://codecov.io/gh/DoSomething/gambit)

# Gambit Campaigns
Gambit Campaigns is an internal DoSomething.org service for completing Campaigns via [Gambit Conversations](https://github.com/dosomething/gambit-conversations) Gambit Campaigns is built using [Express](http://expressjs.com/) and [MongoDB](https://www.mongodb.com).

### Getting Started

Install Node, MongoDB, redis, and the Heroku toolbelt.

Next, fork and clone this repository. To run Gambit locally:
* Mongo should be running.
  * Run `mongo`.
  * If error, Run `sudo mongod`.
* Redis should be running.
  * Run `redis-cli ping`. You should get `PONG` as a response.
  * If error, make sure you have installed redis using `brew` and started the service.
* `npm install`
* `npm run all-tests` Make sure all tests pass
* `heroku local` from your Gambit directory


### License
&copy;2017 DoSomething.org. Gambit Campaigns is free software, and may be redistributed under the terms specified
in the [LICENSE](https://github.com/DoSomething/gambit/blob/dev/LICENSE) file. The name and logo for
DoSomething.org are trademarks of Do Something, Inc and may not be used without permission.
