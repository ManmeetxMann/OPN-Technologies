# OPN Platform Services

> Services for the OPN Plaform that are used by the iOS and Android Apps

![OPN API Docs CD Action](https://github.com/OPN-Technologies/services/workflows/OPN%20API%20Docs%20CD%20Action/badge.svg?branch=development)

![OPN Config Service CD Action](https://github.com/OPN-Technologies/services/workflows/OPN%20Config%20Service%20CD%20Action/badge.svg?branch=development)

![OPN Registry Service CD Action](https://github.com/OPN-Technologies/services/workflows/OPN%20Registry%20Service%20CD%20Action/badge.svg?branch=development)

![OPN Passport Service CD Action](https://github.com/OPN-Technologies/services/workflows/OPN%20Passport%20Service%20CD%20Action/badge.svg?branch=development)

![OPN Enterprise Service CD Action](https://github.com/OPN-Technologies/services/workflows/OPN%20Enterprise%20Service%20CD%20Action/badge.svg?branch=development)

![Deploy Access Service](https://github.com/OPN-Technologies/services/workflows/OPN%20Access%20Service%20CD%20Action/badge.svg?branch=master)

![OPN Lookup Service CD Action](https://github.com/OPN-Technologies/services/workflows/OPN%20Lookup%20Service%20CD%20Action/badge.svg?branch=development)

## About

### Philosophy

The following are important elements to the engineering principles of the OPN Platform:

- Anonyimity and Privacy First Design
- Mobile Wallet
    - Store all PII (personally identifialble information) and PHI (personal health information)
    - For now all data is kept indefinitely however soon there'll be a wipe of data
- Cloud "Agents"
    - Contains tokens
- TDD (Test Driven Development)
    - All classes must have unit tests using Jest
    - All services must have stub-based tests at the interface

### Architecture

The services are architected into service groupings which are intended to be separately hosted cloud-based applicatons. Each service grouping is designed to be isolated and to maximize the privacy of data. 

#### Available Services and Components

The following services are available for the OPN platform:

| Service | Package | Description |
|---------|-------------|-------------|
| Config   | @opn/config   | Config services with all exposed app settings |
| Registry | @opn/registry | Registry for users of the admin - both users and admins |
| Lookup   | @opn/lookup   | Lookup / CMS service for apps |
| Enterprise   | @opn/enterprice   | Enterprise side APIs - mostly for connected users |
| Passport   | @opn/passport   | Passport services to manage digital health passports |
| Access   | @opn/access   | Access services for gating in and out |


And we our common software / code sits in the following packages:

| Service | Package | Description |
|---------|-------------|-------------|
| Common   | @opn/common   | Common classes and types |
| ApiDocs   | @opn/apidocs   | Swagger / Open API Docs |


#### Technologies Leveraged

OPN Services use the following technologies:

| Tech | Purpose | Description |
|---------|:-----------:|:-----------:|
| GCP | All | [More Info](https://cloud.google.com/gcp) |
| Node.js / JS | All | [More Info](https://nodejs.org) |
| NPM | All | [More Info](http://npmjs.com) |
| Typescript | Dev | [More Info](http://typescriptlang.org) |
| Lerna | Dev | [More Info](http://lerna.js.org) |
| Eslint | Dev | [More Info](http://eslint.org) |
| Jest | Dev | [More Info](http://jestjs.io) |
| Open API / Swagger | Dev | [More Info](https://swagger.io) |


## Developers


### Developer Tools

1. Use Microsoft Visual Studio Code to manage the project
2. /.vscode/launch.json included for debugging
    - First run command line debug (which uses nodemon)
    - Then hit play button in debug tools to connect to proper running instance. It will reload automateically


### DevOps Usage

# Setup
NodeJS: 12
npm install: On ROOT
npm run install-all: On ROOT
npm run dev:debug-all

Make sure .env file is located in **packages/common/.env** and **services-v2/.env**

Use provided .json service account with access to Firebase, MySQL and local secrets 
```sh
gcloud auth activate-service-account --key-file=opn-platform-local-2397063b295f.json
gcloud config set project opn-platform-local
gcloud secrets versions access latest --secret=OPN_PLATFORM_CRDENTIALS > ./packages/common/.env
gcloud secrets versions access latest --secret=OPN_PLATFORM_CRDENTIALS > ./services-v2/.env
```


#### Run in Debug Mode Locally
```
npm run dev:debug-all
```
OR a specific project
```
lerna run --scope @opn/registry dev:debug --stream
```

#### Clean Projects

Delete all distro packages, dependencies and etc

```
npm run clean-all
```
OR a specific project
```
lerna run --scope @opn/registry clean --stream
```

#### Build Distro: Transpile Typescript to pure Javascript
```
npm run build-all
```
OR a specific project
```
lerna run --scope @opn/registry build --stream
```


#### Run Distro
```
cd packages/registry/dist
npm start
```
