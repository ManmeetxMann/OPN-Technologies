# `enterprise`

> Service for OPN Enterprise

## Usage

To run in dev / local mode:

```
lerna run --scope @opn/enterprise dev --stream
```

To build for distribution:
```
lerna run --scope @opn/enterprise build --stream
```

To build + deploy to GCP Cloud
```
lerna run --scope @opn/enterprise deploy --stream
```

To run distribution version (run inside ./dist)
```
npm start
```
