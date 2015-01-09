#!/bin/bash

#
# Push config settings based on local config .json files to the production database.
#

# Prompt user to make sure they don't do this by accident
echo
echo "***********************"
echo "**    DANGER ZONE    **"
echo "***********************"
echo

read -p "You're about to upload your config settings to production, are you sure? [y/n] " -r

echo # Just moving to the next line

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Source environment variables
  source ./.push_config.conf

  # Import local config changes to production db
  if [ -n "$SMS_CONFIG_DB_HOST" ] && \
     [ -n "$SMS_CONFIG_DB_PORT" ] && \
     [ -n "$SMS_CONFIG_DB_USERNAME" ] && \
     [ -n "$SMS_CONFIG_DB_PASSWORD" ] && \
     [ -n "$SMS_CONFIG_JITSU_USERNAME" ] && \
     [ -n "$SMS_CONFIG_JITSU_PASSWORD" ] && \
     [ -n "$SMS_CONFIG_JITSU_APP_NAME" ]; then

    echo "Pushing configs to production..."

    mongoimport -u $CONFIG_DB_USERNAME -p $CONFIG_DB_PASSWORD --host $CONFIG_DB_HOST --port $CONFIG_DB_PORT --db config --collection tips < app/lib/ds-routing/config/tips.json --jsonArray

    mongoimport -u $CONFIG_DB_USERNAME -p $CONFIG_DB_PASSWORD --host $CONFIG_DB_HOST --port $CONFIG_DB_PORT --db config --collection donorschoose < app/lib/donations/config/donorschoose.json --jsonArray

    mongoimport -u $CONFIG_DB_USERNAME -p $CONFIG_DB_PASSWORD --host $CONFIG_DB_HOST --port $CONFIG_DB_PORT --db config --collection campaign_start < app/lib/ds-routing/config/campaign-start.json --jsonArray

    mongoimport -u $CONFIG_DB_USERNAME -p $CONFIG_DB_PASSWORD --host $CONFIG_DB_HOST --port $CONFIG_DB_PORT --db config --collection start_campaign_transitions < app/lib/ds-routing/config/start-campaign-transitions.json --jsonArray

    mongoimport -u $CONFIG_DB_USERNAME -p $CONFIG_DB_PASSWORD --host $CONFIG_DB_HOST --port $CONFIG_DB_PORT --db config --collection yes_no_paths < app/lib/ds-routing/config/yes-no-paths.json --jsonArray

    mongoimport -u $CONFIG_DB_USERNAME -p $CONFIG_DB_PASSWORD --host $CONFIG_DB_HOST --port $CONFIG_DB_PORT --db config --collection competitive_stories < app/lib/sms-games/config/competitive-stories.json --jsonArray

    echo "\n\nFinished updating production database"

    # Install jitsu if it's not already
    if [ ! type jitsu &> /dev/null ] || [ ! type npm &> /dev/null ]; then
        echo "jitsu or npm not installed, make sure you have both"
    else
        echo "jitsu and npm are available"
    fi

    # Set Nodejitsu username and password
    jitsu config set username $SMS_CONFIG_JITSU_USERNAME
    jitsu config set password $SMS_CONFIG_JITSU_PASSWORD

    # Restart the app so the new configs can be loaded
    jitsu apps restart $SMS_CONFIG_JITSU_APP_NAME

    echo "\n\nApp restarted with new configs! Done!\n\n"
  else
    echo "Missing environment variables. Unable to push config to production. See push_config.conf for details."
  fi
else
  echo "whew. ok then."
fi
