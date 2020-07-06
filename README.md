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

The services are architected into service groupings which are intended to be separately hosted cloud-based applicatons. The following services are available for the OPN platform:

| Service | Package | Description |
|---------|:-----------:|:-----------:|
| Registry | @opn/registry | TBD... |
| Access   | @opn/access   | TBD... |
| Config   | @opn/config   | TBD... |
| Enterprise   | @opn/enterprice   | TBD... |
| Lookup   | @opn/lookup   | TBD... |
| Passport   | @opn/passport   | TBD... |

And we our common software / code sits in the following packages:

| Service | Package | Description |
|---------|:-----------:|:-----------:|
| Common   | @opn/common   | Common classes |

OPN Services use the following technologies:

| Tech | Purpose | Description |
|---------|:-----------:|:-----------:|
| GCP | All | TBD... |
| Node.js / JS | All | TBD... |
| NPM | All | TBD... |
| Typescript | Dev | TBD... |
| Lerna | Dev | TBD... |
| Eslint | Dev | TBD... |
| Jest | Dev | TBD... |
| Swagger | Dev | TBD... |


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