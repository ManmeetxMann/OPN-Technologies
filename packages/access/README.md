# `access`

> Service for OPN Access

## Usage

To run in dev / local mode:

```
lerna run --scope @opn/access dev --stream
```

To build for distribution:
```
lerna run --scope @opn/access build --stream
```

To build + deploy to GCP Cloud
```
lerna run --scope @opn/access deploy --stream
```

To run distribution version (run inside ./dist)
```
npm start
```
