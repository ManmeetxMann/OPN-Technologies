import App from '../../common/src/express/app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from '../../common/src/middlewares/logger'

import InternalController from './controllers/internal.controller'
import AdminController from './controllers/admin.controller'
import AdminTagController from './controllers/v3/admin.tag.controller'
import UserController from './controllers/user.controller'
import UserV3Controller from './controllers/v3/user.controller'
import AdminUserV3Controller from './controllers/v3/admin.user.controller'
import GroupV3Controller from './controllers/v3/group.controller'
import RecommendationsController from './controllers/v3/recommendation.controller'
import HealthpassController from './controllers/v3/healthpass.controller'
import PubSubController from './controllers/v3/pubsub.controller'
import AdminUserV4Controller from './controllers/admin/v4/user.controller'
import RootController from './controllers/root.controller'
import OrganizationController from './controllers/organization.controller'
import AdminOrganizationController from './controllers/admin/v1/organization.controller'
import UserInternalController from './controllers/v1/internal/user.controller'
import {IdentifiersModel} from '../../common/src/data/identifiers'
import DataStore from '../../common/src/data/datastore'
import UserV1Controller from './controllers/v1/user.controller'
import InternalV1Controller from './controllers/v1/internal/internal.controller'

// Init SQL connection and data model
import {createConnection} from 'typeorm'
import {join} from 'path'
import {Config} from '../../common/src/utils/config'
import {isGAEService} from '../../common/src/utils/app-engine-environment'

const PORT = Number(process.env.PORT) || 5003

const app = new App({
  port: PORT,
  validation: true,
  corsOptions: '*',
  controllers: [
    new RootController(),
    new UserController(),
    new UserV1Controller(),
    new UserV3Controller(),
    new AdminController(),
    new AdminUserV3Controller(),
    new AdminUserV4Controller(),
    new AdminTagController(),
    new InternalController(),
    new OrganizationController(),
    new GroupV3Controller(),
    new AdminOrganizationController(),
    new UserInternalController(),
    new RecommendationsController(),
    new HealthpassController(),
    new PubSubController(),
    new InternalV1Controller(),
  ],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
  initializers: [new IdentifiersModel(new DataStore())],
})

/**
 * TODO:
 * 1. Move it to wrapper similar to express
 */
let connection = {}
if (isGAEService()) {
  // Connect via socket when deployed to GCP
  connection = {
    host: Config.get('DB_SQL_HOST'),
    extra: {
      socketPath: Config.get('DB_SQL_HOST'),
    },
  }
} else {
  // Connect via TCP when on local with local DB or Cloud SQL with proxy
  connection = {
    host: Config.get('DB_SQL_LOCAL_HOST'),
    port: Number(Config.get('DB_SQL_LOCAL_PORT')),
  }
}

createConnection({
  ...connection,
  type: 'mysql',
  database: Config.get('DB_SQL_NAME'),
  username: Config.get('DB_SQL_USERNAME'),
  password: Config.get('DB_SQL_PASSWORD'),
  entities: [join(__dirname, '../../../services-v2/apps/user-service/src/model/**/*.ts')],
  synchronize: false,
  logging: false,
})
  .then(() => {
    console.log('DB connection established')
    app.listen()
  })
  .catch((error) => {
    console.error('No connection to SQL database')
    console.error(error)
  })

export const init = (): void => app.initialize()
