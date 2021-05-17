# Cloud functions
Google Cloud Functions is a serverless execution environment for building and connecting cloud services. With Cloud Functions you write simple, single-purpose functions that are attached to events emitted from your cloud infrastructure and services.

# Project setup
Project uses typescript, has CI via github actions.
Build process creates a folder for each function to isolate a code per function.

## Getting Started
Install dependencies
```bash
npm install
```

Create .env file with functions secrets:
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_PHONE_NUMBER

For local testing ONLY: 
TO_TEST_NUMBER

Launch local development server which watches .ts files, compiles it and restarts @google-cloud/functions-framework server
```bash
npm run watch
```

## Usage
src/sms-notification is a background function which listed to pub/sub toping and sends SMS notification using twilio service.

src/another-handler demo function to test multiple functions build and deployment process

execute/index is local development helper to make background function triggerable as http method

## Running the tests and linting
```bash
npm run lint
```

Project uses jest testing framework
```bash
npm run test
```