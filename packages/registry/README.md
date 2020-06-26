# `registry`

> Service for OPN Registry

## Usage

To run in dev / local mode:

```
lerna run --scope @opn/registry dev --stream
```

To build for distribution:
```
lerna run --scope @opn/registry build --stream
```

To build + deploy to GCP Cloud
```
lerna run --scope @opn/registry deploy --stream
```

To run distribution version (run inside ./dist)
```
npm start
```
