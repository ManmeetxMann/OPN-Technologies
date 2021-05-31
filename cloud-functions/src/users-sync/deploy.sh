
gcloud functions deploy user-v1-sync-create \
    --entry-point=createUser \
    --source=./dist \
    --runtime=nodejs12 \
    --memory=128MB \
    --trigger-event=providers/cloud.firestore/eventTypes/document.create \
    --trigger-resource="projects/opn-platform-local/databases/(default)/documents/users/{userId}" \
    --env-vars-file=./.env

gcloud functions deploy user-v1-sync-update \
    --entry-point=updateUser \
    --source=./dist \
    --runtime=nodejs12 \
    --memory=128MB \
    --trigger-event=providers/cloud.firestore/eventTypes/document.update \
    --trigger-resource="projects/opn-platform-local/databases/(default)/documents/users/{userId}" \
    --env-vars-file=./.env
