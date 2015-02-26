#!/bin/bash

# Evaluates if db env. variables are present by converting them to a string and evaluating for non-zero length. 
if [ -n "$SMS_CONFIG_DB_HOST" ] && \
   [ -n "$SMS_CONFIG_DB_PORT" ] && \
   [ -n "$SMS_CONFIG_DB_USERNAME" ] && \
   [ -n "$SMS_CONFIG_DB_PASSWORD" ] && \
   [ -n "$WERCKER_MONGODB_HOST" ] && \
   [ -n "$WERCKER_MONGODB_PORT" ]; then

  # Exporting configs from production
  mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c tips -o app/lib/ds-routing/config/tips.json

  mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c donorschoose -o app/lib/donations/config/donorschoose.json

  mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c campaign_start -o app/lib/ds-routing/config/campaign-start.json

  mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c start_campaign_transitions -o app/lib/ds-routing/config/start-campaign-transitions.json

  mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c yes_no_paths -o app/lib/ds-routing/config/yes-no-paths.json

  mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c competitive_stories -o app/lib/sms-games/config/competitive-stories.json

  mongoexport --host $SMS_CONFIG_DB_HOST --port $SMS_CONFIG_DB_PORT --db config -u $SMS_CONFIG_DB_USERNAME -p $SMS_CONFIG_DB_PASSWORD --jsonArray -c reportbacks -o app/lib/reportback/config/reportbacks.json

  # Importing to wercker db
  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --jsonArray -c tips --file app/lib/ds-routing/config/tips.json

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --jsonArray -c donorschoose --file app/lib/donations/config/donorschoose.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --jsonArray -c campaign_start --file app/lib/ds-routing/config/campaign-start.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --jsonArray -c start_campaign_transitions --file app/lib/ds-routing/config/start-campaign-transitions.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --jsonArray -c yes_no_paths --file app/lib/ds-routing/config/yes-no-paths.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --jsonArray -c competitive_stories --file app/lib/sms-games/config/competitive-stories.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --jsonArray -c reportbacks --file app/lib/reportback/config/reportbacks.json --jsonArray

else

  echo "Error - At least one of these env vars isn't set:"
  echo "  - SMS_CONFIG_DB_HOST"
  echo "  - SMS_CONFIG_DB_PORT"
  echo "  - SMS_CONFIG_DB_USERNAME"
  echo "  - SMS_CONFIG_DB_PASSWORD"
  echo "  - WERCKER_MONGODB_HOST"
  echo "  - $WERCKER_MONGODB_PORT"

fi