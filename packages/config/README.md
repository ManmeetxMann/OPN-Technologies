# `config`

> Service for OPN Config

## Usage

To run in dev / local mode:

```
lerna run --scope @opn/config dev --stream
```

To build for distribution:
```
lerna run --scope @opn/config build --stream
```

To build + deploy to GCP Cloud
```
lerna run --scope @opn/config deploy --stream
```

To run distribution version (run inside ./dist)
```
npm start
```
