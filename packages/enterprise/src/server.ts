import App from '../../common/src/express/app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from '../../common/src/middlewares/logger'

import InternalController from './controllers/admin/internal.controller'
import AdminController from './controllers/admin/admin.controller'
import AdminTagController from './controllers/admin/v3/tag.controller'
import UserController from './controllers/public/user.controller'
import UserV3Controller from './controllers/public/v3/user.controller'
import AdminUserV3Controller from './controllers/admin/v3/user.controller'
import AdminUserV4Controller from './controllers/admin/v4/user.controller'
import RootController from './controllers/public/root.controller'
import OrganizationController from './controllers/public/organization.controller'
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
    new AdminUserV4Controller(),
    new AdminTagController(),
    new InternalController(),
    new OrganizationController(),
  ],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
  initializers: [new IdentifiersModel(new DataStore())],
})

app.listen()

export const init = (): void => app.initialize()
