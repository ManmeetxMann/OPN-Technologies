# `passport`

> Service for OPN Passport

## Usage

To run in dev / local mode:

```
lerna run --scope @opn/passport dev --stream
```

To build for distribution:
```
lerna run --scope @opn/passport build --stream
```

To build + deploy to GCP Cloud
```
lerna run --scope @opn/passport deploy --stream
```

To run distribution version (run inside ./dist)
```
npm start
```
