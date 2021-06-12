import App from '../../common/src/express/app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from '../../common/src/middlewares/logger'

import AdminController from './controllers/admin.controller'
import PassportController from './controllers/v1/passport.controller'
import PubSubController from './controllers/v1/pubsub.controller'
import InternalController from './controllers/v1/internal/passport.controller'
import AdminPassportController from './controllers/v1/admin/passport.controller'
import RootController from './controllers/root.controller'
import UserController from './controllers/user.controller'

import {IdentifiersModel} from '../../common/src/data/identifiers'
import DataStore from '../../common/src/data/datastore'

const PORT = Number(process.env.PORT) || 5005

export const app = new App({
  port: PORT,
  validation: true,
  corsOptions: '*',
  controllers: [
    new RootController(),
    new AdminController(),
    new PassportController(),
    new InternalController(),
    new PubSubController(),
    new AdminPassportController(),
    new UserController(),
  ],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
  initializers: [new IdentifiersModel(new DataStore())],
})

app.listen()

export const init = (): void => app.initialize()
