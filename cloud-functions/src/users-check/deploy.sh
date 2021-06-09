gcloud auth list

gcloud functions deploy user-v1-check \
    --entry-point=checkUserSyncCoverage \
    --memory=128MB \
    --region=$REGION \
    --source=./dist \
    --runtime=nodejs12 \
    --trigger-topic=schedule

gcloud functions deploy patient-v1-sync \
    --entry-point=checkPatientSyncCoverage \
    --region=$REGION \
    --memory=128MB \
    --source=./dist \
    --runtime=nodejs12 \
    --trigger-topic=schedule

