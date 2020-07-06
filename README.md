# `services`

> Service for the OPN Plaform

## Usage

CLEAN PROJECTS

```
npm run clean-all
```
OR a specific project
```
lerna run --scope @opn/registry clean --stream
```


INSTALL DEPENDECIES
```
npm run install-all
```
OR a specific project
```
cd packages/registry
npm install
```


RUN IN DEBUG MODE LOCALLY
```
npm run dev:debug-all
```
OR a specific project
```
lerna run --scope @opn/registry dev:debug --stream
```


DO A BUILD
```
npm run build-all
```
OR a specific project
```
lerna run --scope @opn/registry build --stream
```


RUN DISTRO VERSION
```
cd packages/registry
npm start
```


DEPLOY TO GCP
```
npm run deploy-all
```
OR a specific project
```
lerna run --scope @opn/registry deploy --stream
```