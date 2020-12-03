import App from '../../common/src/express/app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from '../../common/src/middlewares/logger'

import InternalController from './controllers/internal.controller'
import AdminController from './controllers/admin.controller'
import AdminTagController from './controllers/v3/admin.tag.controller'
import UserController from './controllers/user.controller'
import UserV3Controller from './controllers/v3/user.controller'
import AdminUserV3Controller from './controllers/v3/admin.user.controller'
import RootController from './controllers/root.controller'
import OrganizationController from './controllers/organization.controller'
import {IdentifiersModel} from '../../common/src/data/identifiers'
import DataStore from '../../common/src/data/datastore'

const PORT = Number(process.env.PORT) || 5003

const app = new App({
  port: PORT,
  validation: true,
  corsOptions: '*',
  controllers: [
    new RootController(),
    new UserController(),
    new UserV3Controller(),
    new AdminController(),
    new AdminUserV3Controller(),
    new AdminTagController(),
    new InternalController(),
    new OrganizationController(),
  ],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
  initializers: [new IdentifiersModel(new DataStore())],
})

app.listen()

export const init = (): void => app.initialize()
