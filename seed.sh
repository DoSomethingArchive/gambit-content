#!/bin/bash

# Evaluates if db env. variables are present by converting them to a string and evaluating non-zero length. 
if [ -n "$WERCKER_MONGODB_HOST"] -a -n "$WERCKER_MONGODB_PORT" ]; then 
  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection tips_configs < app/lib/ds-routing/config/tips.json --jsonArray
  mongoimport --host $WERCKER_MONGODB_HOST --port $WERCKER_MONGODB_PORT --db config --collection donorschoose_configs < app/lib/donations/config/donorschoose.json --jsonArray
else 
  mongoimport --db config --collection donorschoose_configs < app/lib/donations/config/donorschoose.json --jsonArray
  mongoimport --db config --collection tips_configs < app/lib/ds-routing/config/tips.json --jsonArray
  mongoimport --db config --collection campaign_start_configs < app/lib/ds-routing/config/campaign-start.json --jsonArray
fi