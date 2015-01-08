#!/bin/bash

#
# Pull config from the production database to the local database.
#

# Prompt the user before running
echo
echo "*******************"
echo "**    WARNING    **"
echo "*******************"
echo

read -p "You're about to update your local config database with the one on production. You sure about this? [y/n] " -r

echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Source environment variables
  source ./.deploy_config.conf

  if [ -n "$SMS_CONFIG_DB_HOST" ] && \
     [ -n "$SMS_CONFIG_DB_PORT" ] && \
     [ -n "$SMS_CONFIG_DB_USERNAME" ] && \
     [ -n "$SMS_CONFIG_DB_PASSWORD" ]; then
  
    # Dump collections from production
    mongodump --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD -c tips
    mongodump --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD -c donorschoose
    mongodump --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD -c campaign_start
    mongodump --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD -c start_campaign_transitions
    mongodump --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD -c yes_no_paths
    mongodump --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD -c competitive_stories
  
    # Then restore to currently running mongod
    mongorestore

    echo "\nLocal database updated with config from production!\n"
  fi
else
  echo "Carry on."
fi
