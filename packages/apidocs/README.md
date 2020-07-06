# `apidocs`

> Service for OPN API Docs

## Usage

To run in dev / local mode:

```
lerna run --scope @opn/apidocs dev --stream
lerna run --scope @opn/apidocs dev:debug --stream
```

To build for distribution:
```
lerna run --scope @opn/apidocs build --stream
```

To build + deploy to GCP Cloud
```
lerna run --scope @opn/apidocs deploy --stream
```

To run distribution version (run inside ./dist)
```
npm start
```
