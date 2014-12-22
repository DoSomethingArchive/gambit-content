#!/bin/bash

# Evaluates if db env. variables are present by converting them to a string and evaluating for non-zero length. 
if [ -n "$WERCKER_MONGODB_HOST"] -a -n "$WERCKER_MONGODB_PORT" ]; then 

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection tips_configs < app/lib/ds-routing/config/tips.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection donorschoose_configs < app/lib/donations/config/donorschoose.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection campaign_start_configs < app/lib/ds-routing/config/campaign-start.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection start_campaign_transitions_configs < app/lib/ds-routing/config/start-campaign-transitions.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection yes_no_paths_configs < app/lib/ds-routing/config/yes-no-paths.json --jsonArray

  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection babysitter_configs < app/lib/pregnancytext/babysitter-config.json --jsonArray

else

  mongoimport --db config --collection donorschoose_configs < app/lib/donations/config/donorschoose.json --jsonArray

  mongoimport --db config --collection tips_configs < app/lib/ds-routing/config/tips.json --jsonArray

  mongoimport --db config --collection campaign_start_configs < app/lib/ds-routing/config/campaign-start.json --jsonArray

  mongoimport --db config --collection start_campaign_transitions_configs < app/lib/ds-routing/config/start-campaign-transitions.json --jsonArray

  mongoimport --db config --collection yes_no_paths_configs < app/lib/ds-routing/config/yes-no-paths.json --jsonArray

  mongoimport --db config --collection babysitter_configs < app/lib/pregnancytext/babysitter-config.json --jsonArray

fi