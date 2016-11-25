'use strict';

const stathat = app.locals.stathat;
const logger = app.locals.logger;

let channel = {};

function onError(err) {
  logger.error('Rabbit Error', err);
  stathat(`gambit-core rabbit error ${err.code}`);
}

function makeConnection() {
  logger.info('Attempting amqp connection');

  channel = require('amqplib')
  .connect(process.env.RABBIT_URI)
  .then(connection => connection.createChannel())
  .catch(err => {
    onError(err);
    setTimeout(makeConnection, 2000);
  });
}
makeConnection();

module.exports = {
  produce(queueName, message) {
    return channel
    .assertQueue(queueName)
    .then(() => channel.sendToQueue(queueName, new Buffer(message)))
    .catch(onError);
  },
};
