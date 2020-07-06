# OPN Platform Services

> Services for the OPN Plaform

## About

### Overview

TBD....

### Architecture

The services are architected into service groupings which are intended to be separately hosted cloud-based applicatons.

The following services are available for the OPN platform:

| Service | Package | Description |
|---------|:-----------:|:-----------:|
| Registry | @opn/registry | TBD... |
| Access   | @opn/access   | TBD... |
| Config   | @opn/config   | TBD... |
| Enterprise   | @opn/enterprice   | TBD... |
| Lookup   | @opn/lookup   | TBD... |
| Passport   | @opn/passport   | TBD... |
| Common   | @opn/common   | TBD... |

The services use the following technologies:

| Tech | Distro/Dev | Description |
|---------|:-----------:|:-----------:|
| Node.js | TBD... | TBD... |
| NPM | TBD... | TBD... |
| Typescript | TBD... | TBD... |
| Lerna | TBD... | TBD... |
| Eslint | TBD... | TBD... |
| Jest | TBD... | TBD... |
| Swagger | TBD... | TBD... |
| GCP | TBD... | TBD... |


## Usage

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