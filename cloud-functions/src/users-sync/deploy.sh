gcloud functions deploy user-v1-sync-create \
    --entry-point=createUser \
    --region=$REGION \
    --source=./dist \
    --runtime=nodejs12 \
    --memory=128MB \
    --trigger-event=providers/cloud.firestore/eventTypes/document.create \
    --trigger-resource="projects/$PROJECT_ID/databases/(default)/documents/users/{userId}" \
    --env-vars-file=./.env

gcloud functions deploy user-v1-sync-update \
    --entry-point=updateUser \
    --region=$REGION \
    --source=./dist \
    --runtime=nodejs12 \
    --memory=128MB \
    --trigger-event=providers/cloud.firestore/eventTypes/document.update \
    --trigger-resource="projects/$PROJECT_ID/databases/(default)/documents/users/{userId}" \
    --env-vars-file=./.env
