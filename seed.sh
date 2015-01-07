#!/bin/bash

# Evaluates if db env. variables are present by converting them to a string and evaluating for non-zero length. 
if [ -n "$CONFIG_DB_HOST"] -a -n "$CONFIG_DB_PORT" ]; then

  mongoimport --host $CONFIG_DB_HOST --port $CONFIG_DB_PORT --db config --collection tips < app/lib/ds-routing/config/tips.json --jsonArray

  mongoimport --host $CONFIG_DB_HOST --port $CONFIG_DB_PORT --db config --collection donorschoose < app/lib/donations/config/donorschoose.json --jsonArray

  mongoimport --host $CONFIG_DB_HOST --port $CONFIG_DB_PORT --db config --collection campaign_start < app/lib/ds-routing/config/campaign-start.json --jsonArray

  mongoimport --host $CONFIG_DB_HOST --port $CONFIG_DB_PORT --db config --collection start_campaign_transitions < app/lib/ds-routing/config/start-campaign-transitions.json --jsonArray

  mongoimport --host $CONFIG_DB_HOST --port $CONFIG_DB_PORT --db config --collection yes_no_paths < app/lib/ds-routing/config/yes-no-paths.json --jsonArray

  mongoimport --host $CONFIG_DB_HOST --port $CONFIG_DB_PORT --db config --collection competitive_stories < app/lib/sms-games/config/competitive-stories.json --jsonArray

elif [ -n "$WERCKER_MONGODB_HOST"] -a -n "$WERCKER_MONGODB_PORT" ]; then 

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection tips < app/lib/ds-routing/config/tips.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection donorschoose < app/lib/donations/config/donorschoose.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection campaign_start < app/lib/ds-routing/config/campaign-start.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection start_campaign_transitions < app/lib/ds-routing/config/start-campaign-transitions.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection yes_no_paths < app/lib/ds-routing/config/yes-no-paths.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection competitive_stories < app/lib/sms-games/config/competitive-stories.json --jsonArray

else

  mongoimport --db config --collection donorschoose < app/lib/donations/config/donorschoose.json --jsonArray

  mongoimport --db config --collection tips < app/lib/ds-routing/config/tips.json --jsonArray

  mongoimport --db config --collection campaign_start < app/lib/ds-routing/config/campaign-start.json --jsonArray

  mongoimport --db config --collection start_campaign_transitions < app/lib/ds-routing/config/start-campaign-transitions.json --jsonArray

  mongoimport --db config --collection yes_no_paths < app/lib/ds-routing/config/yes-no-paths.json --jsonArray

  mongoimport --db config --collection competitive_stories < app/lib/sms-games/config/competitive-stories.json --jsonArray

fi