# Run in a shell before launching a server to point to test services
# This is a fallback for if dev:local doesn't work

export FIRESTORE_EMULATOR_HOST="localhost:8080"
export PUBSUB_EMULATOR_HOST="localhost:8085"

# treat auth tokens as authUserIds
export GUILIBLE_MODE="enabled"

