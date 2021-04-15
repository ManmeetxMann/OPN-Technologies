import * as bodyParser from 'body-parser'

import App from '../../common/src/express/app'
import loggerMiddleware from '../../common/src/middlewares/logger'
import AdminController from './controllers/admin.controller'
import AccessController from './controllers/v1/access.controller'
import AccessAdminController from './controllers/v1/admin/access.controller'
import RootController from './controllers/root.controller'
import {IdentifiersModel} from '../../common/src/data/identifiers'
import DataStore from '../../common/src/data/datastore'

const PORT = Number(process.env.PORT) || 5002

const app = new App({
  port: PORT,
  validation: true,
  corsOptions: '*',
  controllers: [
    new RootController(),
    new AdminController(),
    new AccessAdminController(),
    new AccessController(),
  ],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
  initializers: [new IdentifiersModel(new DataStore())],
})

app.listen()

export const init = (): void => app.initialize()
