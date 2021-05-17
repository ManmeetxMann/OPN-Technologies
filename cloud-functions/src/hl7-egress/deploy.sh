# Reads secret from .env file
read_var() {
    VAR=$(grep $1 $2 | xargs)
    IFS="=" read -ra VAR <<< "$VAR"
    echo ${VAR[1]}
}

gcloud functions deploy hl7-test \
    --source=./dist \
    --runtime nodejs12 \
    --memory 128MB \
    --trigger-topic pcr-test-topic \
    --set-env-vars TWILIO_ACCOUNT_SID=$(read_var TWILIO_ACCOUNT_SID .env),TWILIO_AUTH_TOKEN=$(read_var TWILIO_AUTH_TOKEN .env),TWILIO_FROM_PHONE_NUMBER=$(read_var TWILIO_FROM_PHONE_NUMBER .env)

