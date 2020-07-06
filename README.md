# OPN Platform Services

> Services for the OPN Plaform that are used by the iOS and Android Apps

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


## DevOps Usage

### Clean Projects

Delete all distro packages, dependencies and etc

```
npm run clean-all
```
OR a specific project
```
lerna run --scope @opn/registry clean --stream
```


### Install Dependecies
```
npm run install-all
```
OR a specific project
```
cd packages/registry
npm install
```


### Run in Debug Mode Locally
```
npm run dev:debug-all
```
OR a specific project
```
lerna run --scope @opn/registry dev:debug --stream
```


### Build Distro: Transpile Typescript to pure Javascript
```
npm run build-all
```
OR a specific project
```
lerna run --scope @opn/registry build --stream
```


### Run Distro
```
cd packages/registry
npm start
```


### Deploy to GCP
```
npm run deploy-all
```
OR a specific project
```
lerna run --scope @opn/registry deploy --stream
```