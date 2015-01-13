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
echo "NOTE: Documents sharing the same _id will not be overwritten.\n"

read -p "You're about to update your local config database with the one on production. You sure about this? [y/n] " -r

echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Source environment variables
  source ./.pull_config.conf

  if [ -n "$SMS_CONFIG_DB_HOST" ] && \
     [ -n "$SMS_CONFIG_DB_PORT" ] && \
     [ -n "$SMS_CONFIG_DB_USERNAME" ] && \
     [ -n "$SMS_CONFIG_DB_PASSWORD" ]; then
  
    # Export collections from production
    mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c tips -o app/lib/ds-routing/config/tips.json
    mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c donorschoose -o app/lib/donations/config/donorschoose.json
    mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c campaign_start -o app/lib/ds-routing/config/campaign-start.json
    mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c start_campaign_transitions -o app/lib/ds-routing/config/start-campaign-transitions.json
    mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c yes_no_paths -o app/lib/ds-routing/config/yes-no-paths.json
    mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c competitive_stories -o app/lib/sms-games/config/competitive-stories.json
    mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c reportbacks -o app/lib/reportback/config/reportbacks.json
  
    # Then import them to the currently running mongod
    mongoimport --db config --jsonArray -c tips --file app/lib/ds-routing/config/tips.json
    mongoimport --db config --jsonArray -c donorschoose --file app/lib/donations/config/donorschoose.json
    mongoimport --db config --jsonArray -c campaign_start --file app/lib/ds-routing/config/campaign-start.json
    mongoimport --db config --jsonArray -c start_campaign_transitions --file app/lib/ds-routing/config/start-campaign-transitions.json
    mongoimport --db config --jsonArray -c yes_no_paths --file app/lib/ds-routing/config/yes-no-paths.json
    mongoimport --db config --jsonArray -c competitive_stories --file app/lib/sms-games/config/competitive-stories.json
    mongoimport --db config --jsonArray -c reportbacks --file app/lib/reportback/config/reportbacks.json

    echo "\nLocal database updated with config from production!\n"
  fi
else
  echo "Carry on."
fi
