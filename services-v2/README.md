# OPN - Services
This project has been bootstrap with [Nest](https://github.com/nestjs/nest), a NodeJs-based framework.

# Reference Architecture 
The project is a monorepo that contains a shared library and apps for each different services.

## Infrastructure
All the infrastructure will be provided as code using Terraform, available in a separate git repo.

## API versioning
All APIs would be versioned starting from `1` and incrementing when a breaking change is introduced.

## API Documentation
The API documentation will be generating using the Swagger decorators given by the Nest integration.
Therefor there's no more need to manually write in an openapi.yaml file.

Cf. https://docs.nestjs.com/openapi/introduction

All the services would be providing a swagger document at the path `/api/doc`.
 
## Persistence Layer
Each service will have its own persistence layer for more isolation between them.
 
Since we're running on GCP and we have the need to:
- Maintain relation between domain
- Handle schema migration
- Support fast and complex query

The engine would be either MySQL or Postgres. 
However, a MySQL instance would be a better choice since it offers more connection 
for the smallest machine available on GCP.

Regarding the version of MySQL, GCP now supports MySQL_8.0 which support CTE (Common Table Expression).
That feature allows us to speed up some queries. For example with recursive call on a same query. 

Eg. if we want to get dependant for a user, the base query for the parent will be the same as for the children. 

## Shared Library
The shared library will handle:
- Common DTOs (Data Transfer Object) like `ResponseWrapper`
- Common Models like `Auditable`
- Middlewares: logger, authentication, etc...
- Exceptions
- Utilities functions
- Generate swagger page

The shared library is importable from `@opn/common`

# Get started
###Prerequisites
1. Install GCP CLI [Quick Start](https://cloud.google.com/sdk/docs/quickstart) 
1. Get service account for local project, authorize via google CLI and select dev project
    ```sh
    gcloud auth activate-service-account --key-file=opn-platform-local-2397063b295f.json
    gcloud config set project opn-platform-local
    ```
1. Install NodeJS >=12.13.0 and NPM ^7.8.0

### Installation
1. Install packages
    ```sh
    npm install
    ```
1. Make sure are using a dev project
    ```sh
    gcloud config get-value project
    ```
    Should return `opn-platform-local`
1. Obtain secrets in .env file for dev project
    ```sh
    gcloud secrets versions access latest --secret=OPN_SERVICES_V2_SECRETS > ./.env
    ```

## Configure environment

### Cloud SQL database
Clouds SQL is accessible on local environment for application and DB management tools via cloud SQL proxy when authenticated with CGP CLI.
1. Install cloud SQL proxy for you OS: [Quick start](https://cloud.google.com/sql/docs/mysql/quickstart-proxy-test)
1. Launch cloud SQL proxy.
    ```sh
    cloud_sql_proxy -instances=opn-platform-local:northamerica-northeast1:opn-platform-db-server-local:sql-inst=tcp:3306
    ```
1. MySQL DB should be accessible for local connection from application or DB management tool using host: 127.0.0.1:3306. Login, password and DB name will be in .env file.
### OR
### Local database
Create local mysql datasource .
- Pull Docker image (latest is 8.x)
`docker pull mysql`
- Run image
`docker run --name opn-mysql -e MYSQL_ROOT_PASSWORD=password -p 127.0.0.1:3310:3306 -d mysql:latest`
- Set authentication protocol
```SQL
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
flush privileges;
```
## Running the app

```sh
# development
npm run start [SERVICE_NAME]

# watch mode
npm run start:dev [SERVICE_NAME]

# production mode
npm run start:prod [SERVICE_NAME]

npm run start:dev user-service
```
Open http://localhost:8080/api/doc/, enter login:password from .env SWAGGER_BASIC_AUTH_CREDENTIALS

#### SERVICE_NAME:
1. user-service
1. passport-service

## Test

```sh
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```
