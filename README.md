* :speech_balloon: :calling:
* [docs](https://github.com/DoSomething/gambit/wiki)

# Setup
## Entire Gambit System w/ Docker
All Gambit services & required dependencies can be setup locally with docker compose. See the [gambit-services](https://github.com/DoSomething/gambit-services) repo.

## Standalone w/ Docker
In order to setup this app & required dependencies, simply

1. `git clone`
2. `docker-compose up`

### Docker setup under the hood
All apps are executed by `Foreman` to handle process management & mimic Heroku.
`Nodemon` will autoreload the server when a file changes.
The compose file defines env variables for connection details & network mapping.

## Standalone without Docker
1. Run an instance of RabbitMQ, MongoDB. Two options,
  * Install these tools locally & run them
  * Run the docker container with just backend tooling configured.
2. Edit .env with correct service URI's, most likely in for the form of service://localhost:<port>.
3. `npm start` (requires Foreman from the Heroku Toolbelt)
