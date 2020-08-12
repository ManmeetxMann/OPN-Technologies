# Run in a shell before launching a server to point to test services

export FIRESTORE_EMULATOR_HOST="localhost:8080"
export PUBSUB_EMULATOR_HOST="localhost:8085"

# treat auth tokens as authUserIds
export GUILIBLE_MODE="true"

