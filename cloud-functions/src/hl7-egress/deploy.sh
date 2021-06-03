gcloud functions deploy hl7-egress \
    --entry-point=requestHandler \
    --egress-settings=private-ranges-only \
    --region=$REGION \
    --source=./dist \
    --runtime=nodejs12 \
    --memory=128MB \
    --trigger-topic=$TRIGGER_TOPIC \
    --vpc-connector=projects/$PROJECT_ID/locations/$REGION/connectors/connector-subnet1 \
    --env-vars-file=./.env
