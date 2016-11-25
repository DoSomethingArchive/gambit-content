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

  const connection = require('amqplib');

  connection.connect(process.env.RABBIT_URI)
  .then(connection => connection.createChannel())
  .then(ch => channel = ch)
  .catch(err => {
    onError(err);
    setTimeout(makeConnection, 2000);
  });
}
makeConnection();

module.exports = {
  produce(queueName, message) {
    const outgoing = JSON.stringify(message);

    return channel
    .assertQueue(queueName)
    .then(() => channel.sendToQueue(queueName, new Buffer(outgoing)))
    .catch(onError);
  },
};
