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

```bash
gcloud secrets versions access latest --secret=CF_USERS_SYNC > ./.env
```

## Testing

Use NPM script from the parent project

## Running the tests and linting

```bash
npm run lint
```
